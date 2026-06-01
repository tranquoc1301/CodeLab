import re

_FUNC_DEF_RE = re.compile(r"^\s*(?:def|function)\s+(\w+)\s*\(", re.MULTILINE)
_LOOP_LINE_RE = re.compile(r"^\s*(?:for|while)\s+", re.MULTILINE)
_IF_LINE_RE = re.compile(r"^\s*if\s+", re.MULTILINE | re.IGNORECASE)

# Array-like variable names (not memo/dp dicts)
_ARRAY_VARS = re.compile(r"\b(arr|nums?|list|array|matrix|grid)\s*\[\s*\w+\s*\]", re.IGNORECASE)


def _defined_funcs(code: str) -> set[str]:
    return set(_FUNC_DEF_RE.findall(code))


def _count_loop_lines(code: str) -> int:
    return len(_LOOP_LINE_RE.findall(code))


def _function_bodies(code: str) -> dict[str, str]:
    bodies: dict[str, str] = {}
    lines = code.splitlines()
    current_name: str | None = None
    current_lines: list[str] = []
    in_body = False
    for line in lines:
        m = _FUNC_DEF_RE.match(line)
        if m:
            if current_name:
                bodies[current_name] = "\n".join(current_lines)
            current_name = m.group(1)
            current_lines = []
            in_body = True
        elif in_body:
            current_lines.append(line)
    if current_name:
        bodies[current_name] = "\n".join(current_lines)
    return bodies


def _has_recursive_call_in_body(body: str, name: str) -> bool:
    if not body.strip():
        return False
    return f"{name}(" in body


def _body_has_condition(body: str) -> bool:
    return bool(_IF_LINE_RE.search(body))


def _body_has_memo(body: str) -> bool:
    return bool(
        re.search(r"\bmemo\b", body)
        or re.search(r"\bcache\b", body)
        or re.search(r"\blru_cache\b", body)
        or re.search(r"\bdp\s*\[", body)
    )


# ── RECURSION_ERROR ─────────────────────────────────────────────────


def missing_base_case(code: str) -> float:
    bodies = _function_bodies(code)
    if not bodies:
        return 0.0
    for name, body in bodies.items():
        if not _has_recursive_call_in_body(body, name):
            continue
        if not _body_has_condition(body):
            return 0.8
    return 0.0


def recursion_excessive_depth(code: str) -> float:
    """Recursive call without memo — will deep-dive on large inputs."""
    bodies = _function_bodies(code)
    if not bodies:
        return 0.0
    for name, body in bodies.items():
        if not _has_recursive_call_in_body(body, name):
            continue
        if _body_has_condition(body) and not _body_has_memo(body):
            return 0.3
    return 0.0


# ── COMPLEXITY_ERROR ────────────────────────────────────────────────


def nested_loops(code: str) -> float:
    depth = 0
    max_depth = 0
    for line in code.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("#", "//", "/*")):
            continue
        if re.match(r"^\s*(?:for|while)\s+", stripped):
            depth += 1
            max_depth = max(max_depth, depth)
        elif "}" in stripped:
            depth = max(0, depth - stripped.count("}"))
    if max_depth >= 3:
        return 0.9
    if max_depth == 2:
        return 0.7
    return 0.0


def repeated_linear_scans(code: str) -> float:
    count = _count_loop_lines(code)
    if count >= 5:
        return 0.6
    if count >= 3:
        return 0.3
    return 0.0


# ── MEMORY_REFERENCE_ERROR ──────────────────────────────────────────


def unchecked_array_access(code: str) -> float:
    if not _ARRAY_VARS.search(code):
        return 0.0
    if re.search(r"\bif\b.*\b(len|length|size)\b", code):
        return 0.0
    access_count = len(_ARRAY_VARS.findall(code))
    if access_count >= 3:
        return 0.5
    return 0.0


def potential_null_dereference(code: str) -> float:
    if "null" in code or "none" in code:
        return 0.0
    dot_calls = re.findall(r"(\w+)\.(\w+)\(", code)
    if not dot_calls:
        return 0.0
    if "if " not in code:
        return 0.2
    return 0.0


# ── LOGIC_CALCULATION_ERROR ─────────────────────────────────────────


def wrong_comparison_operator(code: str) -> float:
    score = 0.0
    if re.search(r"<\s*\w+", code) and not re.search(r"<=\s*\w+", code):
        if "range" in code:
            score += 0.2
    if re.search(r">\s*\w+", code) and not re.search(r">=\s*\w+", code):
        score += 0.2
    return score


def off_by_one_loop(code: str) -> float:
    if re.search(r"range\(\s*\w+\)", code):
        if re.search(r"\[i\s*\+\s*1\]", code) or re.search(r"\[i\s*-\s*1\]", code):
            return 0.5
    if re.search(r"range\(\s*\w+\s*-\s*1\s*\)", code):
        return 0.3
    return 0.0


def missing_accumulator_update(code: str) -> float:
    acc_keywords = ("total", "sum", "result", "count", "ans")
    has_acc = any(kw in code for kw in acc_keywords)
    if not has_acc:
        return 0.0
    has_update = bool(re.search(r"\b(total|sum|result|count|ans)\s*[\+\-\*\/]=", code))
    has_loop = _count_loop_lines(code) > 0
    if has_acc and has_loop and not has_update:
        if "return " in code:
            return 0.3
    return 0.0


# ── BOUNDARY_CONDITION_ERROR ────────────────────────────────────────


def missing_empty_input_guard(code: str) -> float:
    has_guard = bool(
        re.search(r"\b(?:if|while)\b.*\b(len|length|size)\b.*==\s*0\b", code)
        or re.search(r"\b(?:if|while)\b.*\bnot\b", code)
        or "if not " in code
    )
    has_range = bool(re.search(r"\brange\s*\(", code))
    if has_range and not has_guard:
        return 0.2
    return 0.0


def hardcoded_index_usage(code: str) -> float:
    score = 0.0
    if re.search(r"\[0\]", code) and not re.search(r"\b(len|length|size)\b", code):
        score += 0.2
    if re.search(r"\[-1\]", code) and not re.search(r"\b(len|length|size)\b", code):
        score += 0.2
    return score


# ── ALGORITHM_DESIGN_ERROR ──────────────────────────────────────────


def brute_force_pattern(code: str) -> float:
    loop_lines = _count_loop_lines(code)
    if loop_lines >= 3:
        return 0.8
    if loop_lines == 2:
        has_efficient_ds = bool(
            re.search(r"\b(set|dict|map|hash|defaultdict|counter|heap|deque)\b", code)
        )
        has_lookup = bool(
            re.search(r"(==\s*\w+|contains|found|target|result)", code)
        )
        has_early_return = bool(
            re.search(r"return\s+(True|False|1|0|null)\b", code)
        )
        if not has_efficient_ds and (has_lookup or has_early_return):
            return 0.8
        if not has_efficient_ds:
            return 0.5
    return 0.0


def missing_data_structure(code: str) -> float:
    if " in " in code and "list" in code:
        if not re.search(r"\b(set|dict|map|hash)\b", code):
            return 0.3
    return 0.0


# ── registry ─────────────────────────────────────────────────────────

RULE_REGISTRY: list[tuple[str, list]] = [
    ("recursion_error", [missing_base_case]),
    ("complexity_error", [nested_loops, repeated_linear_scans]),
    ("memory_reference_error", [unchecked_array_access, potential_null_dereference]),
    ("logic_calculation_error", [
        wrong_comparison_operator, off_by_one_loop, missing_accumulator_update,
    ]),
    ("boundary_condition_error", [missing_empty_input_guard, hardcoded_index_usage]),
    ("algorithm_design_error", [brute_force_pattern, missing_data_structure]),
]


def classify_by_rules(code: str, topic_slugs: list[str]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for label, rules in RULE_REGISTRY:
        max_score = 0.0
        for rule in rules:
            max_score = max(max_score, rule(code))
        if max_score > 0:
            scores[label] = max_score
    return scores
