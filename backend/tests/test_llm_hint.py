import json
from types import SimpleNamespace

import pytest

from app.services import llm_hint
from app.services.llm_hint import (
    LLM_MAX_TOKENS,
    _build_prompt,
    _call_llm,
    build_fallback_hint,
    parse_validate_format_hint,
)
from app.services.llm_hint_prompts import build_full_prompt


def test_build_full_prompt_includes_json_and_domain_constraints():
    system_prompt, user_content = build_full_prompt(
        next_level=1,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict={"status": "Wrong Answer"},
        source_code="print(1)",
        problem_description="",
        language="python3",
        include_error_context=False,
    )

    assert "Respond with valid JSON only" in system_prompt
    assert "Use only the verdict" in system_prompt
    assert "progressive disclosure" in system_prompt
    assert "Required keys: bug_type, effect, question" in user_content
    assert "Problem      : " in user_content
    assert "Error type   :" not in user_content
    assert "Expected     :" not in user_content
    assert "Not available" not in user_content


def test_build_prompt_hides_error_context_only_for_level_one():
    verdict = {"status": "Wrong Answer", "expected_output": "42"}

    _, level_one_user_content = _build_prompt(
        next_level=1,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict=verdict,
        source_code="print(1)",
        problem_description="Find the answer.",
        language="python3",
    )
    _, level_two_user_content = _build_prompt(
        next_level=2,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict=verdict,
        source_code="print(1)",
        problem_description="Find the answer.",
        language="python3",
    )

    assert "Error type   :" not in level_one_user_content
    assert "Error type   : Wrong Answer — unhandled edge case or boundary condition" in level_two_user_content
    assert "Expected     : 42" in level_one_user_content


def test_level_prompts_enforce_progressive_tutor_behavior():
    _, level_one_user_content = _build_prompt(
        next_level=1,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict={"status": "Wrong Answer"},
        source_code="print(nums[i + 1])",
        problem_description="Return matching indices.",
        language="cpp",
    )
    _, level_two_user_content = _build_prompt(
        next_level=2,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict={"status": "Wrong Answer"},
        source_code="print(nums[i + 1])",
        problem_description="Return matching indices.",
        language="cpp",
    )
    _, level_three_user_content = _build_prompt(
        next_level=3,
        error_context="Wrong Answer — unhandled edge case or boundary condition",
        verdict={"status": "Wrong Answer"},
        source_code="print(nums[i + 1])",
        problem_description="Return matching indices.",
        language="cpp",
    )

    assert "broad tutor guidance" in level_one_user_content
    assert "Do NOT name any variable, function, expression, index, or line" in level_one_user_content
    assert "Do NOT point to the exact suspicious operation" in level_one_user_content
    assert "role-based area to inspect" in level_two_user_content
    assert "Do NOT simply repeat the broad Level 1 concept" in level_two_user_content
    assert "concrete fix direction" in level_three_user_content
    assert "Avoid vague phrases" in level_three_user_content
    assert "inspect failing context" in level_three_user_content


def test_level_three_fallback_is_tutor_like_and_not_generic_placeholder():
    fallback = build_fallback_hint(3, "Wrong Answer — unhandled edge case or boundary condition")

    assert "The failing behavior must be isolated" not in fallback
    assert "inspect failing context" not in fallback
    assert "derive the needed value from that current item" in fallback
    assert "same step" in fallback


@pytest.mark.asyncio
async def test_call_llm_sends_system_and_user_messages_with_level_three_token_budget(monkeypatch):
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
                                    "bug_type": "Index reasoning",
                                    "effect": "The selected value can differ from the current step",
                                    "question": "Which value should this step use?",
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

    assert json.loads(output)["bug_type"] == "Index reasoning"
    assert captured_payload["json"]["messages"] == [
        {"role": "system", "content": "system rules"},
        {"role": "user", "content": "user task"},
    ]
    assert captured_payload["json"]["max_tokens"] == LLM_MAX_TOKENS
    assert LLM_MAX_TOKENS >= 500


@pytest.mark.parametrize(
    ("level", "payload", "expected"),
    [
        (
            1,
            {"bug_type": "Boundary issue", "effect": "The answer differs on an edge case", "question": "Which boundary input changes the result?"},
            "1. Error type: Boundary issue",
        ),
        (
            2,
            {"fault_area": "The branch that handles small inputs", "concept": "Boundary condition", "question": "Does that branch cover the smallest input?"},
            "1. Fault area: The branch that handles small inputs",
        ),
        (
            3,
            {"exact_issue": "The loop skips the last candidate", "pseudocode": "for each candidate\ncheck condition\nupdate result", "why_it_works": "It considers every required candidate"},
            "1. Exact issue: The loop skips the last candidate",
        ),
    ],
)
def test_parse_validate_format_hint_accepts_valid_level_json(level, payload, expected):
    hint = parse_validate_format_hint(json.dumps(payload), level)

    assert expected in hint


def test_parse_validate_format_hint_allows_optimization_wording_at_level_three():
    payload = {
        "exact_issue": "The current approach needs a more efficient direction for large inputs",
        "pseudocode": "choose a faster lookup structure\nprocess each item once\nreturn when the needed value is found",
        "why_it_works": "This optimization reduces repeated work while preserving the required checks",
    }

    hint = parse_validate_format_hint(json.dumps(payload), 3)

    assert "optimization reduces repeated work" in hint


@pytest.mark.parametrize(
    ("level", "payload"),
    [
        (
            1,
            {
                "bug_type": "Optimization issue",
                "effect": "The program may take too long",
                "question": "Which part repeats work?",
            },
        ),
        (
            2,
            {
                "fault_area": "The repeated lookup area",
                "concept": "Optimization",
                "question": "Where is work repeated?",
            },
        ),
    ],
)
def test_parse_validate_format_hint_rejects_optimization_wording_at_early_levels(level, payload):
    with pytest.raises(ValueError):
        parse_validate_format_hint(json.dumps(payload), level)


@pytest.mark.parametrize(
    "raw_content",
    [
        "not json",
        json.dumps({"bug_type": "Boundary issue", "effect": "The answer differs"}),
        json.dumps({"bug_type": "Boundary issue", "effect": "The answer differs", "question": "Why?", "extra": "No"}),
        json.dumps({"bug_type": "Boundary issue", "effect": "The answer differs", "question": "```python"}),
        json.dumps({"bug_type": "Boundary issue", "effect": "Here is the complete solution", "question": "Why?"}),
    ],
)
def test_parse_validate_format_hint_rejects_invalid_output(raw_content):
    with pytest.raises(ValueError):
        parse_validate_format_hint(raw_content, 1)


def test_parse_validate_format_hint_caps_long_fields():
    raw_content = json.dumps(
        {
            "bug_type": "x" * 500,
            "effect": "The output differs",
            "question": "Which case first differs?",
        }
    )

    hint = parse_validate_format_hint(raw_content, 1)

    assert "x" * 351 not in hint
