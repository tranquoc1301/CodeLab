import base64
import json
import hashlib
from datetime import datetime
from typing import Any


def encode_cursor(sort_by: str, last_id: int, last_value: Any) -> str:
    cursor_data = {
        "sort": sort_by,
        "id": last_id,
        "val": str(last_value) if last_value is not None else None,
    }
    encoded = json.dumps(cursor_data)
    return base64.urlsafe_b64encode(encoded.encode()).decode()


def decode_cursor(cursor: str | None) -> dict | None:
    if not cursor:
        return None
    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(decoded)
        if not isinstance(data, dict):
            return None
        required_keys = {"sort", "id", "val"}
        if not required_keys.issubset(data.keys()):
            return None
        return data
    except Exception:
        return None


def parse_sort_params(sort_by: str) -> tuple[str, bool]:
    descending = True
    order_col = "created_at"
    
    if sort_by == "newest":
        order_col = "created_at"
        descending = True
    elif sort_by == "oldest":
        order_col = "created_at"
        descending = False
    elif sort_by == "frontend_id":
        order_col = "frontend_id"
        descending = False
    elif sort_by == "title":
        order_col = "title"
        descending = False
    
    return order_col, descending


def generate_cursor_signature(params: dict[str, Any]) -> str:
    serialized = json.dumps(params, sort_keys=True)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]