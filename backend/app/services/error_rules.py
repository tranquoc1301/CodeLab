import ast


def _tree(code: str) -> ast.Module | None:
    try:
        return ast.parse(code)
    except SyntaxError:
        return None


def _recursive_function_nodes(tree: ast.Module) -> list[ast.FunctionDef | ast.AsyncFunctionDef]:
    names = {n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
    out: list[ast.FunctionDef | ast.AsyncFunctionDef] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            out.append(node)
    return out


def _call_names_in(node: ast.AST) -> set[str]:
    names: set[str] = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Call) and isinstance(child.func, ast.Name):
            names.add(child.func.id)
    return names


# ── recursion ─────────────────────────────────────────────────────
def missing_base_case(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    for fn in _recursive_function_nodes(tree):
        if fn.name not in _call_names_in(fn):
            continue
        has_if = any(isinstance(n, ast.If) for n in ast.walk(fn))
        if not has_if:
            return 0.8
    return 0.0


def recursion_excessive_depth(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    for fn in _recursive_function_nodes(tree):
        if fn.name not in _call_names_in(fn):
            continue
        has_memo = any(
            (isinstance(n, ast.Attribute) and n.attr in {"lru_cache", "cache"})
            or (
                isinstance(n, ast.Subscript)
                and isinstance(getattr(n, "value", None), ast.Name)
                and n.value.id in {"memo", "dp"}
            )
            for n in ast.walk(fn)
        )
        if not has_memo:
            return 0.5
    return 0.0


# ── complexity ─────────────────────────────────────────────────────
class _LoopAnalyzer(ast.NodeVisitor):
    def __init__(self) -> None:
        self.depth = 0
        self.max_nested = 0
        self.in_loop = False

    def _enter(self) -> None:
        if self.in_loop:
            self.max_nested = max(self.max_nested, self.depth + 1)
        self.depth += 1
        self.max_nested = max(self.max_nested, self.depth)
        self.in_loop = True

    def _exit(self) -> None:
        self.in_loop = False
        self.depth = max(0, self.depth - 1)

    def visit_For(self, node: ast.For) -> None:
        self._enter()
        self.generic_visit(node)
        self._exit()

    def visit_While(self, node: ast.While) -> None:
        self._enter()
        self.generic_visit(node)
        self._exit()


def _nested_loop_depth(code: str) -> int:
    tree = _tree(code)
    if tree is None:
        return 0
    analyzer = _LoopAnalyzer()
    analyzer.visit(tree)
    return analyzer.max_nested


def nested_loops(code: str) -> float:
    depth = _nested_loop_depth(code)
    if depth >= 3:
        return 0.9
    if depth == 2:
        return 0.8
    return 0.0


def repeated_linear_scans(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    count = sum(1 for node in ast.walk(tree) if isinstance(node, (ast.For, ast.While)))
    if count >= 5:
        return 0.6
    if count >= 3:
        return 0.3
    return 0.0


# ── memory/reference ───────────────────────────────────────────────
def unchecked_array_access(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    subscripts = [node for node in ast.walk(tree) if isinstance(node, ast.Subscript)]
    if not subscripts:
        return 0.0
    len_call_names = {"len", "length", "size"}
    has_len_check = False
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            if any(
                (
                    isinstance(c, ast.Call)
                    and isinstance(getattr(c, "func", None), ast.Name)
                    and c.func.id in len_call_names
                )
                for c in node.comparators
            ):
                has_len_check = True
    if has_len_check:
        return 0.0
    return 0.4 if len(subscripts) >= 2 else 0.0


def potential_null_dereference(code: str) -> float:
    lowered = code.lower()
    if "none" in lowered or "null" in lowered:
        return 0.0
    tree = _tree(code)
    if tree is None:
        return 0.0
    attr_calls = sum(1 for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute))
    has_guard = any(isinstance(node, ast.If) for node in ast.walk(tree))
    if attr_calls and not has_guard:
        return 0.3 if attr_calls >= 2 else 0.15
    return 0.0


# ── logic/calculation ──────────────────────────────────────────────
def wrong_comparison_operator(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    gt_lt = 0
    gte_lte = 0
    in_range_loop = False
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(getattr(node, "func", None), ast.Name) and node.func.id == "range":
            in_range_loop = True
        if isinstance(node, ast.Compare):
            if any(isinstance(op, (ast.Lt, ast.Gt)) for op in node.ops):
                gt_lt += 1
            elif any(isinstance(op, (ast.LtE, ast.GtE)) for op in node.ops):
                gte_lte += 1
    score = 0.0
    if in_range_loop and gt_lt >= 1 and gte_lte == 0:
        score += min(0.2 * gt_lt, 0.4)
    return min(score, 0.4)


def off_by_one_loop(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    in_range = False
    count = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(getattr(node, "func", None), ast.Name) and node.func.id == "range":
            in_range = True
            if node.args and isinstance(node.args[0], ast.BinOp) and isinstance(node.args[0].op, ast.Sub):
                return 0.35
        if isinstance(node, ast.Subscript):
            sl = getattr(node, "slice", None)
            if isinstance(sl, ast.BinOp) and isinstance(sl.op, (ast.Add, ast.Sub)):
                count += 1
    return 0.3 if in_range and count >= 1 else 0.0


def missing_accumulator_update(code: str) -> float:
    allowed = {"total", "sum", "result", "count", "ans"}
    tree = _tree(code)
    if tree is None:
        return 0.0
    assigned = {
        n.target.id
        for n in ast.walk(tree)
        if isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name)
    }
    if not any(name in assigned for name in allowed):
        return 0.0
    has_loop = any(isinstance(n, (ast.For, ast.While)) for n in ast.walk(tree))
    if not has_loop:
        return 0.0
    if not any(isinstance(n, ast.Return) for n in ast.walk(tree)):
        return 0.0
    return 0.0


# ── boundary ────────────────────────────────────────────────────────
def missing_empty_input_guard(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    has_len_check = False
    len_call_names = {"len", "length", "size"}
    has_not_guard = False
    for node in ast.walk(tree):
        if isinstance(node, ast.Compare):
            if any(
                (
                    isinstance(c, ast.Call)
                    and isinstance(getattr(c, "func", None), ast.Name)
                    and c.func.id in len_call_names
                )
                for c in node.comparators
            ):
                has_len_check = True
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            has_not_guard = True
    has_range = any(
        isinstance(node, ast.Call) and isinstance(getattr(node, "func", None), ast.Name) and node.func.id == "range"
        for node in ast.walk(tree)
    )
    if has_range and not (has_len_check or has_not_guard):
        return 0.2
    return 0.0


def hardcoded_index_usage(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    has_length_check = any(
        isinstance(node, ast.Compare)
        and any(
            (
                isinstance(c, ast.Call)
                and isinstance(getattr(c, "func", None), ast.Name)
                and c.func.id in {"len", "length", "size"}
            )
            for c in node.comparators
        )
        for node in ast.walk(tree)
    )
    if has_length_check:
        return 0.0
    hardcoded = sum(1 for node in ast.walk(tree) if isinstance(node, ast.Constant) and node.value in {0, -1, 1})
    return min(hardcoded * 0.1, 0.3)


# ── algorithm design ────────────────────────────────────────────────
def brute_force_pattern(code: str) -> float:
    tree = _tree(code)
    if tree is None:
        return 0.0
    loops = sum(1 for node in ast.walk(tree) if isinstance(node, (ast.For, ast.While)))
    has_set = any(
        isinstance(node, ast.Call)
        and (
            (isinstance(node.func, ast.Name) and node.func.id in {"set", "dict"})
            or (isinstance(node.func, ast.Attribute) and node.func.attr in {"set", "dict"})
        )
        for node in ast.walk(tree)
    )
    early = any(
        isinstance(node, ast.Return) and isinstance(node.value, ast.Constant) and node.value.value in {True, False, 1, 0, None}
        for node in ast.walk(tree)
    )
    if loops >= 3:
        return 0.8
    if loops == 2:
        if not has_set and early:
            return 0.8
        if not has_set:
            return 0.5
    return 0.0


def missing_data_structure(code: str) -> float:
    lowered = code.lower()
    if " in " in lowered and ("list" in lowered or "array" in lowered):
        if not any(k in lowered for k in ["set", "dict", "map", "hash", "counter"]):
            return 0.3
    return 0.0


# ── registry ────────────────────────────────────────────────────────
RULE_REGISTRY: list[tuple[str, list]] = [
    ("recursion_error", [missing_base_case, recursion_excessive_depth]),
    ("complexity_error", [nested_loops, repeated_linear_scans]),
    ("memory_reference_error", [unchecked_array_access, potential_null_dereference]),
    ("logic_calculation_error", [wrong_comparison_operator, off_by_one_loop, missing_accumulator_update]),
    ("boundary_condition_error", [missing_empty_input_guard, hardcoded_index_usage]),
    ("algorithm_design_error", [brute_force_pattern, missing_data_structure]),
]


def classify_by_rules(code: str, topic_slugs: list[str]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for label, rules in RULE_REGISTRY:
        max_score = 0.0
        for rule in rules:
            score = float(rule(code))
            if score > max_score:
                max_score = score
        if max_score > 0:
            scores[label] = max_score
    return scores
