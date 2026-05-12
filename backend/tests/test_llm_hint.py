import json
from types import SimpleNamespace

import pytest

from app.services import llm_hint
from app.services.hint_diagnostics import DiagnosticSnapshot
from app.services.llm_hint import (
    LLM_MAX_TOKENS,
    _build_prompt,
    _call_llm,
    build_fallback_hint,
    parse_validate_format_hint,
)


def _snapshot(
    label: str = "algorithm_design_error",
    detail: str = "wrong_answer_state_index",
) -> DiagnosticSnapshot:
    return DiagnosticSnapshot(
        diagnosis_label=label,
        diagnosis_display="Algorithm Design Error",
        diagnosis_detail=detail,
        diagnosis_detail_display="Sai chỉ số/trạng thái",
        learner_summary="Logic đang lấy nhầm trạng thái ở bước hiện tại.",
        observed_symptom="Output thực tế lệch khỏi expected output trên ca fail.",
        focus_area="biến chỉ số hoặc trạng thái vừa được cập nhật trong vòng lặp",
        concept_hint="thứ tự cập nhật trạng thái",
        failure_signal="Input fail: [1,2,3] | Actual: 3 | Expected: 4",
    )


def test_build_full_prompt_uses_vietnamese_tutor_contract():
    system_prompt, user_content = _build_prompt(
        next_level=1,
        diagnostic_snapshot=_snapshot(),
        verdict={"status": "Wrong Answer"},
        source_code="print(1)",
        problem_description="Tìm kết quả đúng.",
        language="python3",
        previous_hints=[],
    )

    assert "tiếng Việt" in system_prompt
    assert "Trả về đúng JSON này" in user_content
    assert "Diagnosis label" not in user_content
    assert "Tutor summary:" in user_content


def test_build_prompt_includes_previous_hints_for_later_levels():
    _, user_content = _build_prompt(
        next_level=3,
        diagnostic_snapshot=_snapshot(),
        verdict={"status": "Wrong Answer", "expected_output": "42"},
        source_code="print(nums[i + 1])",
        problem_description="Return matching indices.",
        language="cpp",
        previous_hints=["1. Quan sát lỗi: ...", "1. Vùng cần soi: ..."],
    )

    assert "Previous hints:" in user_content
    assert "- Level 1:" in user_content
    assert "- Level 2:" in user_content
    assert "Expected output: 42" in user_content


@pytest.mark.asyncio
async def test_call_llm_sends_system_and_user_messages_with_token_budget(monkeypatch):
    captured_payload = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "observation": "Bạn đang dùng sai nhóm trạng thái cần kiểm tra.",
                                    "impact": "Output hiện tại lệch khỏi expected output ở ca fail.",
                                    "question": "Ở bước đó, bạn đang so sánh dữ liệu của phần tử nào?",
                                }
                            )
                        }
                    }
                ]
            }

    class FakeAsyncClient:
        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            captured_payload["url"] = url
            captured_payload["headers"] = headers
            captured_payload["json"] = json
            return FakeResponse()

    monkeypatch.setattr(llm_hint.httpx, "AsyncClient", FakeAsyncClient)
    settings = SimpleNamespace(
        LLM_API_KEY="test-key",
        LLM_TIMEOUT=10,
        LLM_BASE_URL="https://example.test",
        LLM_MODEL="test-model",
    )

    output = await _call_llm("system rules", "user task", settings)

    assert json.loads(output)["observation"].startswith("Bạn đang dùng sai")
    assert captured_payload["json"]["messages"] == [
        {"role": "system", "content": "system rules"},
        {"role": "user", "content": "user task"},
    ]
    assert captured_payload["json"]["max_tokens"] == LLM_MAX_TOKENS
    assert LLM_MAX_TOKENS >= 650


@pytest.mark.parametrize(
    ("level", "payload", "expected_label"),
    [
        (
            1,
            {
                "observation": "Bạn đang bỏ sót một nhóm trường hợp đầu vào.",
                "impact": "Kết quả lệch ở test có điều kiện biên.",
                "question": "Nhánh nào xử lý input nhỏ nhất của bạn đang đi qua?",
            },
            "Quan sát lỗi",
        ),
        (
            2,
            {
                "focus_area": "điều kiện quyết định có bỏ qua phần tử hiện tại hay không",
                "concept": "điều kiện biên và thứ tự kiểm tra",
                "question": "Khi điều kiện này sai, biến nào vẫn tiếp tục được dùng?",
            },
            "Khoanh vùng",
        ),
        (
            3,
            {
                "exact_issue": "Biểu thức chọn giá trị để so sánh đang lấy từ trạng thái cũ thay vì trạng thái vừa cập nhật.",
                "next_step": "Hãy sửa bước lấy giá trị so sánh để nó bám đúng phần tử hoặc trạng thái của vòng lặp hiện tại.",
                "why_it_works": "Khi giá trị được lấy đúng nguồn, kết quả cuối sẽ bám sát ca fail mà judge đang báo.",
            },
            "Điểm lệch cụ thể",
        ),
    ],
)
def test_parse_validate_format_hint_accepts_valid_level_json(level, payload, expected_label):
    response = parse_validate_format_hint(
        json.dumps(payload),
        level,
        diagnostic_snapshot=_snapshot(),
    )

    assert response["cards"][0]["label"] == expected_label
    assert response["hint_level"] == level


def test_build_fallback_hint_returns_structured_tutor_payload():
    response = build_fallback_hint(
        3,
        _snapshot("memory_reference_error", "runtime_reference_type"),
    )

    assert response["stage"] == "correct"
    assert response["diagnosis_label"] == "memory_reference_error"
    assert response["diagnosis_detail"] == "runtime_reference_type"
    assert len(response["cards"]) == 3
    assert "Hướng sửa" in response["cards"][1]["label"]


@pytest.mark.parametrize(
    "raw_content",
    [
        "not json",
        json.dumps({"observation": "A", "impact": "B"}),
        json.dumps({"observation": "A", "impact": "B", "question": "```python"}),
        json.dumps({"observation": "A", "impact": "complete solution", "question": "B"}),
    ],
)
def test_parse_validate_format_hint_rejects_invalid_output(raw_content):
    with pytest.raises(ValueError):
        parse_validate_format_hint(raw_content, 1, diagnostic_snapshot=_snapshot())
