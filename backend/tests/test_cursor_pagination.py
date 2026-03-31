import pytest
from app.services.cursor import encode_cursor, decode_cursor, parse_sort_params, generate_cursor_signature


class TestCursorEncoding:
    def test_encode_cursor_basic(self):
        cursor = encode_cursor("newest", 123, "2026-03-31T10:00:00")
        assert cursor is not None
        assert isinstance(cursor, str)

    def test_decode_cursor_valid(self):
        cursor = encode_cursor("newest", 123, "2026-03-31T10:00:00")
        decoded = decode_cursor(cursor)
        assert decoded is not None
        assert decoded["sort"] == "newest"
        assert decoded["id"] == 123
        assert decoded["val"] == "2026-03-31T10:00:00"

    def test_decode_cursor_none(self):
        decoded = decode_cursor(None)
        assert decoded is None

    def test_decode_cursor_invalid(self):
        decoded = decode_cursor("invalid_base64!")
        assert decoded is None

    def test_decode_cursor_malformed_json(self):
        import base64
        malformed = base64.urlsafe_b64encode(b'"just a string"').decode()
        decoded = decode_cursor(malformed)
        assert decoded is None

    def test_decode_cursor_missing_keys(self):
        import base64
        import json
        incomplete = base64.urlsafe_b64encode(json.dumps({"sort": "newest"}).encode()).decode()
        decoded = decode_cursor(incomplete)
        assert decoded is None

    def test_encode_decode_roundtrip_title(self):
        cursor = encode_cursor("title", 456, "Two Sum")
        decoded = decode_cursor(cursor)
        assert decoded is not None
        assert decoded["sort"] == "title"
        assert decoded["id"] == 456
        assert decoded["val"] == "Two Sum"

    def test_encode_decode_roundtrip_frontend_id(self):
        cursor = encode_cursor("frontend_id", 789, "100")
        decoded = decode_cursor(cursor)
        assert decoded is not None
        assert decoded["sort"] == "frontend_id"
        assert decoded["id"] == 789
        assert decoded["val"] == "100"

    def test_encode_cursor_with_none_value(self):
        cursor = encode_cursor("newest", 1, None)
        decoded = decode_cursor(cursor)
        assert decoded is not None
        assert decoded.get("val") is None

    def test_cursor_is_stateless(self):
        cursor1 = encode_cursor("newest", 100, "2026-01-01T00:00:00")
        decoded = decode_cursor(cursor1)
        assert decoded is not None
        assert decoded.get("sort") == "newest"
        assert decoded.get("id") == 100
        assert decoded.get("val") == "2026-01-01T00:00:00"


class TestSortParams:
    def test_parse_newest(self):
        order_col, descending = parse_sort_params("newest")
        assert order_col == "created_at"
        assert descending is True

    def test_parse_oldest(self):
        order_col, descending = parse_sort_params("oldest")
        assert order_col == "created_at"
        assert descending is False

    def test_parse_frontend_id(self):
        order_col, descending = parse_sort_params("frontend_id")
        assert order_col == "frontend_id"
        assert descending is False

    def test_parse_title(self):
        order_col, descending = parse_sort_params("title")
        assert order_col == "title"
        assert descending is False

    def test_parse_invalid_default(self):
        order_col, descending = parse_sort_params("invalid")
        assert order_col == "created_at"
        assert descending is True


class TestCursorSignature:
    def test_generate_cursor_signature_deterministic(self):
        params = {"difficulty": "Easy", "sort_by": "newest", "limit": 20}
        sig1 = generate_cursor_signature(params)
        sig2 = generate_cursor_signature(params)
        assert sig1 == sig2
        assert len(sig1) == 16

    def test_generate_cursor_signature_different_params(self):
        params1 = {"difficulty": "Easy", "sort_by": "newest"}
        params2 = {"difficulty": "Hard", "sort_by": "newest"}
        sig1 = generate_cursor_signature(params1)
        sig2 = generate_cursor_signature(params2)
        assert sig1 != sig2

    def test_generate_cursor_signature_order_independent(self):
        params1 = {"a": 1, "b": 2}
        params2 = {"b": 2, "a": 1}
        sig1 = generate_cursor_signature(params1)
        sig2 = generate_cursor_signature(params2)
        assert sig1 == sig2
