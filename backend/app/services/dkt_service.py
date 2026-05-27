import torch
import torch.nn as nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission
from app.models.problem import Problem

NUM_SKILLS = 72       # Tổng số topics trong CodeLab
EMBED_DIM = 64
HIDDEN = 128
NUM_LAYERS = 1
DROPOUT = 0.3
MODEL_PATH = "app/ml/dkt_best.pt"


class DKTModel(nn.Module):
    def __init__(self, num_skills, embed_dim, hidden_size, num_layers, dropout):
        super().__init__()
        self.embedding = nn.Embedding(
            2 * num_skills + 1, embed_dim,
            padding_idx=2 * num_skills
        )
        self.lstm = nn.LSTM(
            embed_dim, hidden_size, num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, num_skills)

    def forward(self, x, lengths):
        emb = self.embedding(x)
        packed = pack_padded_sequence(emb, lengths.cpu(),
                                      batch_first=True, enforce_sorted=False)
        out, _ = self.lstm(packed)
        out, _ = pad_packed_sequence(out, batch_first=True)
        return torch.sigmoid(self.fc(self.dropout(out)))


# Load model 1 lần khi startup (singleton)
_model = None
_device = None


def get_torch_device() -> torch.device:
    global _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return _device


def get_dkt_model() -> DKTModel:
    global _model
    if _model is None:
        device = get_torch_device()
        _model = DKTModel(NUM_SKILLS, EMBED_DIM, HIDDEN, NUM_LAYERS, DROPOUT)
        state = torch.load(MODEL_PATH, map_location=device)
        # Nếu checkpoint lưu dưới key 'model_state'
        if "model_state" in state:
            state = state["model_state"]
        _model.load_state_dict(state)
        _model.to(device)
        _model.eval()
    return _model


async def get_topic_mastery(db: AsyncSession, user_id: int) -> dict[int, float]:
    """
    Trả về dict {topic_id: mastery_score (0.0 ~ 1.0)} cho user.
    """
    # 1. Lấy lịch sử submission của user, join topic
    result = await db.execute(
        select(Submission, Problem)
        .join(Problem, Submission.problem_id == Problem.id)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.asc())
    )
    rows = result.all()

    if not rows:
        # Không có lịch sử → trả về mastery 0 cho tất cả topics
        return {i: 0.0 for i in range(1, NUM_SKILLS + 1)}

    # 2. Build sequence: mỗi bước = (topic_id - 1, correct)
    # Mỗi bài có thể nhiều topics → flatten, lấy topic đầu tiên
    tokens = []
    for submission, problem in rows:
        if not problem.topics:
            continue
        topic_id = problem.topics[0].id  # topic_id (1-indexed)
        skill_idx = topic_id - 1         # 0-indexed
        correct = 1 if submission.status == "Accepted" else 0
        token = skill_idx + correct * NUM_SKILLS
        tokens.append(token)

    if not tokens:
        return {i: 0.0 for i in range(1, NUM_SKILLS + 1)}

    # 3. Inference
    device = get_torch_device()
    model = get_dkt_model()
    x = torch.tensor([tokens], dtype=torch.long, device=device)       # (1, T)
    lengths = torch.tensor([len(tokens)], dtype=torch.long, device=device)

    with torch.no_grad():
        out = model(x, lengths)   # (1, T, NUM_SKILLS)

    # Lấy output tại bước cuối cùng → mastery hiện tại
    last_output = out[0, -1, :].detach().cpu().numpy()   # (NUM_SKILLS,)

    # topic_id là 1-indexed
    mastery = {i + 1: float(last_output[i]) for i in range(NUM_SKILLS)}
    return mastery
