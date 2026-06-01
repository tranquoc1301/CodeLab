import json
import logging
from pathlib import Path

import torch
import torch.nn as nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.problem import Problem
from app.ml.topic_skill_mapping import get_dkt_skill_for_topic
from app.services.cache import get_cached, set_cached, invalidate_cache

MASTERY_CACHE_TTL = 300  # 5 minutes
MASTERY_CACHE_PREFIX = "dkt:mastery"

# ─── vocabulary ─────────────────────────────────────────────────────
_VOCAB_PATH = Path(__file__).parent.parent / "ml" / "skill2id.json"
with open(_VOCAB_PATH) as _f:
    _VOCAB: dict[str, int] = json.load(_f)

# skill name → int encoding (excludes "*special" which is the pad token)
SKILL2ID: dict[str, int] = {
    k: v for k, v in _VOCAB.items() if k != "*special"
}
SPECIAL_ID: int = _VOCAB["*special"]

# number of *actual* DKT skills (used for model architecture)
# Must match the checkpoint: 36 skills → embedding 2*36+1=73, fc output 36
NUM_SKILLS: int = 36

EMBED_DIM = 64
HIDDEN = 128
NUM_LAYERS = 1
DROPOUT = 0.3
MODEL_PATH = Path(__file__).parent.parent / "ml" / "dkt_best.pt"

logger = logging.getLogger(__name__)

# inverse map: DKT skill name → set of CodeLab topic IDs
DKT_SKILL_TO_TOPIC_IDS: dict[str, set[int]] = {}
for _tid in range(1, 73):  # CodeLab topics are 1-indexed, 1..72
    _skill = get_dkt_skill_for_topic(_tid)
    if _skill is not None:
        DKT_SKILL_TO_TOPIC_IDS.setdefault(_skill, set()).add(_tid)


# ─── model ──────────────────────────────────────────────────────────

class DKTModel(nn.Module):
    def __init__(
        self,
        num_skills: int,
        embed_dim: int,
        hidden_size: int,
        num_layers: int,
        dropout: float,
    ):
        super().__init__()
        # 2 * num_skills: correct=0 and correct=1 for each skill
        # +1: special/pad token
        self.embedding = nn.Embedding(
            2 * num_skills + 1,
            embed_dim,
            padding_idx=2 * num_skills,
        )
        self.lstm = nn.LSTM(
            embed_dim,
            hidden_size,
            num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, num_skills)

    def forward(self, x: torch.Tensor, lengths: torch.Tensor) -> torch.Tensor:
        emb = self.embedding(x)
        packed = pack_padded_sequence(
            emb, lengths.cpu(), batch_first=True, enforce_sorted=False,
        )
        out, _ = self.lstm(packed)
        out, _ = pad_packed_sequence(out, batch_first=True)
        return torch.sigmoid(self.fc(self.dropout(out)))


# ─── singleton ──────────────────────────────────────────────────────

_model: DKTModel | None = None
_device: torch.device | None = None


def get_torch_device() -> torch.device:
    global _device
    if _device is None:
        _device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )
    return _device


def get_dkt_model() -> DKTModel:
    global _model
    if _model is None:
        device = get_torch_device()
        _model = DKTModel(
            NUM_SKILLS, EMBED_DIM, HIDDEN, NUM_LAYERS, DROPOUT
        )
        state = torch.load(MODEL_PATH, map_location=device, weights_only=True)
        if "model_state" in state:
            state = state["model_state"]
        _model.load_state_dict(state)
        _model.to(device)
        _model.eval()
    return _model


# ─── mastery inference ──────────────────────────────────────────────

async def get_topic_mastery(
    db: AsyncSession,
    user_id: int,
) -> dict[int, float]:
    """Return ``{topic_id: mastery_score (0.0 – 1.0)}`` for the user.

    Steps
    -----
    1. Check Redis cache first.
    2. Fetch user's submissions (oldest first) with their problem topics.
    3. Build a DKT interaction sequence using **Codeforces skill IDs**.
       - Each problem may have *multiple* topics → one entry per topic.
       - Topics with no DKT mapping are skipped (no ``0`` fallback).
    4. Run the LSTM → mastery per DKT skill.
    5. Propagate each DKT skill mastery back to **all** CodeLab topics that
       map to it.  Unmapped topics receive ``0.0``.
    6. Store result in Redis cache.
    """
    cache_key = f"{MASTERY_CACHE_PREFIX}:{user_id}"

    # Try cache first
    cached = await get_cached(cache_key)
    if cached is not None:
        # JSON keys are strings; convert back to int
        return {int(k): v for k, v in cached.items()}

    result = await db.execute(
        select(Submission, Problem)
        .join(Problem, Submission.problem_id == Problem.id)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.asc())
    )
    rows = result.all()

    # Default: every CodeLab topic starts at 0.0
    mastery_by_topic: dict[int, float] = {
        tid: 0.0 for tid in range(1, 73)
    }

    if not rows:
        await set_cached(cache_key, {str(k): v for k, v in mastery_by_topic.items()}, ttl=MASTERY_CACHE_TTL)
        return mastery_by_topic

    # Build interaction sequence: tokens are DKT skill IDs × 2 states
    tokens: list[int] = []
    for submission, problem in rows:
        if not problem.topics:
            continue
        correct = 1 if submission.status == "Accepted" else 0
        for topic in problem.topics:
            skill_name = get_dkt_skill_for_topic(topic.id)
            if skill_name is None:
                logger.warning(
                    "DKT: topic_id=%s (%s) has no DKT mapping – skipped",
                    topic.id,
                    topic.name,
                )
                continue
            skill_id = SKILL2ID.get(skill_name)
            if skill_id is None:
                logger.warning(
                    "DKT: skill name '%s' not found in skill2id.json – skipped",
                    skill_name,
                )
                continue
            # Token encoding: skill_id + correct * NUM_SKILLS
            tokens.append(skill_id + correct * NUM_SKILLS)

    if not tokens:
        return mastery_by_topic

    # Run inference
    device = get_torch_device()
    model = get_dkt_model()
    x = torch.tensor([tokens], dtype=torch.long, device=device)
    lengths = torch.tensor([len(tokens)], dtype=torch.long, device=device)

    with torch.no_grad():
        out = model(x, lengths)  # (1, T, NUM_SKILLS)

    # Mastery per DKT skill at the final timestep
    dkt_mastery = out[0, -1, :].detach().cpu().tolist()  # list[float]

    # Propagate: each DKT skill mastery → all CodeLab topics that map to it
    for skill_name, dkt_idx in SKILL2ID.items():
        score = dkt_mastery[dkt_idx] if dkt_idx < len(dkt_mastery) else 0.0
        for topic_id in DKT_SKILL_TO_TOPIC_IDS.get(skill_name, ()):
            mastery_by_topic[topic_id] = score

    # Store in cache (keys must be str for JSON)
    await set_cached(cache_key, {str(k): v for k, v in mastery_by_topic.items()}, ttl=MASTERY_CACHE_TTL)
    return mastery_by_topic
