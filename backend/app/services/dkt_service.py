import json
import logging
from pathlib import Path

import torch
import torch.nn as nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.submission import Submission
from app.models.problem import Problem, Topic
from app.ml.topic_skill_mapping import get_dkt_skill_for_topic
from app.services.cache import get_cached, set_cached

MASTERY_CACHE_TTL = 300  # 5 minutes
MAX_INTERACTION_HISTORY = 200
MASTERY_CACHE_PREFIX = "dkt:mastery"

# ─── vocabulary ─────────────────────────────────────────────────────
_VOCAB_PATH = Path(__file__).parent.parent / "ml" / "skill2id.json"
with open(_VOCAB_PATH) as _f:
    _VOCAB: dict[str, int] = json.load(_f)

# skill name → int encoding
SKILL2ID: dict[str, int] = dict(_VOCAB)

# Must match the checkpoint: 37 skills → embedding 2*37=74, fc output 37
NUM_SKILLS: int = len(SKILL2ID)

EMBED_DIM = 128
HIDDEN = 128
NUM_LAYERS = 1
DROPOUT = 0.1
MODEL_PATH = Path(__file__).parent.parent / "ml" / "dkt_best.pt"

logger = logging.getLogger(__name__)

def _build_dkt_skill_to_topic_ids(topic_ids: list[int]) -> dict[str, set[int]]:
    """Build inverse map from a dynamic list of topic IDs."""
    mapping: dict[str, set[int]] = {}
    for tid in topic_ids:
        skill = get_dkt_skill_for_topic(tid)
        if skill is not None:
            mapping.setdefault(skill, set()).add(tid)
    return mapping


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
        self.num_c = num_skills
        # Same layer names as the pyKT checkpoint so load_state_dict works directly.
        self.interaction_emb = nn.Embedding(num_skills * 2, embed_dim)
        self.lstm_layer = nn.LSTM(
            embed_dim,
            hidden_size,
            num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dropout_layer = nn.Dropout(dropout)
        self.out_layer = nn.Linear(hidden_size, num_skills)

    def forward(self, x: torch.Tensor, lengths: torch.Tensor) -> torch.Tensor:
        emb = self.interaction_emb(x)
        packed = pack_padded_sequence(
            emb, lengths.cpu(), batch_first=True, enforce_sorted=False,
        )
        out, _ = self.lstm_layer(packed)
        out, _ = pad_packed_sequence(out, batch_first=True)
        return torch.sigmoid(self.out_layer(self.dropout_layer(out)))


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
    """Return ``{topic_id: mastery_score (0.0 – 1.0)}`` for the user."""
    cache_key = f"{MASTERY_CACHE_PREFIX}:{user_id}"

    # Try cache first
    cached = await get_cached(cache_key)
    if cached is not None:
        # JSON keys are strings; convert back to int
        return {int(k): v for k, v in cached.items()}

    # Query topic IDs dynamically
    topic_id_result = await db.execute(select(Topic.id))
    all_topic_ids: list[int] = [row[0] for row in topic_id_result.all()]

    # Build inverse map from current topic IDs
    dkt_skill_to_topic_ids = _build_dkt_skill_to_topic_ids(all_topic_ids)

    # Default: every CodeLab topic starts at 0.0
    mastery_by_topic: dict[int, float] = {tid: 0.0 for tid in all_topic_ids}

    result = await db.execute(
        select(Submission, Problem)
        .join(Problem, Submission.problem_id == Problem.id)
        .options(selectinload(Problem.topics))
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.asc())
    )
    rows = result.all()

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
        await set_cached(cache_key, {str(k): v for k, v in mastery_by_topic.items()}, ttl=MASTERY_CACHE_TTL)
        return mastery_by_topic

    # Keep only the most recent interactions; DKT inference is O(T) on sequence length.
    tokens = tokens[-MAX_INTERACTION_HISTORY:]

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
        for topic_id in dkt_skill_to_topic_ids.get(skill_name, ()):
            mastery_by_topic[topic_id] = score

    # Store in cache (keys must be str for JSON)
    await set_cached(cache_key, {str(k): v for k, v in mastery_by_topic.items()}, ttl=MASTERY_CACHE_TTL)
    return mastery_by_topic
