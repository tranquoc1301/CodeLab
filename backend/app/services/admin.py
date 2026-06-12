"""Admin service: business logic for managing problems, topics, users, and submissions."""

from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.problem import (
    CodeSnippet,
    Example,
    Problem,
    ProblemConstraint,
    ProblemHint,
    ProblemTopic,
    Topic,
)
from app.models.submission import Submission
from app.models.submission_error_event import SubmissionErrorEvent
from app.models.user import User
from app.schemas.admin import (
    AdminExtendedStats,
    AdminProblemCreate,
    AdminProblemDetail,
    AdminProblemListItem,
    AdminProblemUpdate,
    AdminStats,
    AdminSubmissionItem,
    AdminTopicCreate,
    AdminTopicItem,
    AdminTopicUpdate,
    AdminUserItem,
    DistributionItem,
)
from app.schemas.problem import (
    CodeSnippetResponse,
    ExampleResponse,
    ProblemConstraintResponse,
    ProblemHintResponse,
    TopicResponse,
)
from app.services.hint_diagnostics import CanonicalErrorLabel, DIAGNOSIS_LABELS


def _slugify_topic(name: str) -> str:
    return name.lower().strip().replace(" ", "-")


async def _resolve_topics(
    db: AsyncSession, names: list[str]
) -> list[Topic]:
    """Find topics by name, creating any that don't exist (case-insensitive)."""
    if not names:
        return []
    resolved: list[Topic] = []
    seen_slugs: set[str] = set()
    for raw_name in names:
        name = raw_name.strip()
        if not name:
            continue
        slug = _slugify_topic(name)
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        result = await db.execute(select(Topic).where(Topic.slug == slug))
        topic = result.scalar_one_or_none()
        if topic is None:
            topic = Topic(name=name, slug=slug)
            db.add(topic)
            await db.flush()
        resolved.append(topic)
    return resolved


async def list_problems_admin(
    db: AsyncSession,
    search: Optional[str],
    difficulty: Optional[str],
    topic_slug: Optional[str],
    page: int,
    page_size: int,
) -> tuple[list[AdminProblemListItem], int]:
    base = select(Problem).options(selectinload(Problem.topics))
    count_q = select(func.count(Problem.id))

    if search:
        pattern = f"%{search}%"
        base = base.where(Problem.title.ilike(pattern))
        count_q = count_q.where(Problem.title.ilike(pattern))
    if difficulty:
        base = base.where(Problem.difficulty == difficulty)
        count_q = count_q.where(Problem.difficulty == difficulty)
    if topic_slug:
        base = base.join(ProblemTopic, ProblemTopic.problem_id == Problem.id).join(
            Topic, Topic.id == ProblemTopic.topic_id
        ).where(Topic.slug == topic_slug)
        count_q = count_q.join(ProblemTopic, ProblemTopic.problem_id == Problem.id).join(
            Topic, Topic.id == ProblemTopic.topic_id
        ).where(Topic.slug == topic_slug)

    total = (await db.execute(count_q)).scalar() or 0

    base = (
        base.order_by(Problem.frontend_id.asc(), Problem.id.asc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    result = await db.execute(base)
    problems = result.scalars().unique().all()

    items = [
        AdminProblemListItem(
            id=p.id,
            problem_id=p.problem_id,
            frontend_id=p.frontend_id,
            title=p.title,
            slug=p.slug,
            difficulty=p.difficulty,
            topics=[
                TopicResponse(id=t.id, name=t.name, slug=t.slug) for t in p.topics
            ],
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in problems
    ]
    return items, total


async def get_problem_admin(
    db: AsyncSession, problem_id: int
) -> Optional[AdminProblemDetail]:
    result = await db.execute(
        select(Problem)
        .options(
            selectinload(Problem.topics),
            selectinload(Problem.examples),
            selectinload(Problem.constraints),
            selectinload(Problem.hints),
            selectinload(Problem.code_snippets),
        )
        .where(Problem.id == problem_id)
    )
    problem = result.unique().scalar_one_or_none()
    if problem is None:
        return None
    return AdminProblemDetail(
        id=problem.id,
        problem_id=problem.problem_id,
        frontend_id=problem.frontend_id,
        title=problem.title,
        slug=problem.slug,
        difficulty=problem.difficulty,
        description=problem.description,
        topics=[
            TopicResponse(id=t.id, name=t.name, slug=t.slug) for t in problem.topics
        ],
        examples=[
            ExampleResponse(
                id=e.id,
                example_num=e.example_num,
                example_text=e.example_text,
                images=e.images or [],
            )
            for e in problem.examples
        ],
        constraints=[
            ProblemConstraintResponse(
                id=c.id,
                sort_order=c.sort_order,
                constraint_text=c.constraint_text,
            )
            for c in problem.constraints
        ],
        hints=[
            ProblemHintResponse(
                id=h.id,
                hint_num=h.hint_num,
                hint_text=h.hint_text,
            )
            for h in problem.hints
        ],
        code_snippets=[
            CodeSnippetResponse(
                id=cs.id,
                language=cs.language,
                code=cs.code,
            )
            for cs in problem.code_snippets
        ],
        created_at=problem.created_at,
        updated_at=problem.updated_at,
    )


async def create_problem_admin(
    db: AsyncSession, data: AdminProblemCreate
) -> AdminProblemDetail:
    problem = Problem(
        problem_id=data.problem_id,
        frontend_id=data.frontend_id,
        title=data.title,
        slug=data.slug,
        difficulty=data.difficulty,
        description=data.description,
    )
    db.add(problem)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Problem with this slug or IDs already exists") from exc

    if data.topics:
        topics = await _resolve_topics(db, data.topics)
        problem.topics = topics

    for ex in data.examples:
        example = Example(
            problem_id=problem.id,
            example_num=ex.example_num,
            example_text=ex.example_text,
            images=ex.images,
        )
        db.add(example)

    for con in data.constraints:
        constraint = ProblemConstraint(
            problem_id=problem.id,
            sort_order=con.sort_order,
            constraint_text=con.constraint_text,
        )
        db.add(constraint)

    for h in data.hints:
        hint = ProblemHint(
            problem_id=problem.id,
            hint_num=h.hint_num,
            hint_text=h.hint_text,
        )
        db.add(hint)

    for sn in data.code_snippets:
        snippet = CodeSnippet(
            problem_id=problem.id,
            language=sn.language,
            code=sn.code,
        )
        db.add(snippet)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Failed to create problem (conflict)") from exc
    await db.refresh(problem)
    return await get_problem_admin(db, problem.id)  # type: ignore[return-value]


async def update_problem_admin(
    db: AsyncSession, problem_id: int, data: AdminProblemUpdate
) -> Optional[AdminProblemDetail]:
    result = await db.execute(
        select(Problem)
        .options(
            selectinload(Problem.topics),
            selectinload(Problem.examples),
            selectinload(Problem.constraints),
            selectinload(Problem.hints),
            selectinload(Problem.code_snippets),
        )
        .where(Problem.id == problem_id)
    )
    problem = result.unique().scalar_one_or_none()
    if problem is None:
        return None

    payload = data.model_dump(exclude_unset=True)

    # Handle topics
    if "topics" in payload:
        topic_names = payload.pop("topics")
        if topic_names is not None:
            problem.topics = await _resolve_topics(db, topic_names)

    # Handle sub-entities: replace all if provided
    if "examples" in payload:
        examples_data = payload.pop("examples")
        if examples_data is not None:
            for ex in problem.examples:
                await db.delete(ex)
            await db.flush()
            for ex in examples_data:
                example = Example(
                    problem_id=problem.id,
                    example_num=ex["example_num"],
                    example_text=ex["example_text"],
                    images=ex.get("images", []),
                )
                db.add(example)

    if "constraints" in payload:
        constraints_data = payload.pop("constraints")
        if constraints_data is not None:
            for con in problem.constraints:
                await db.delete(con)
            await db.flush()
            for con in constraints_data:
                constraint = ProblemConstraint(
                    problem_id=problem.id,
                    sort_order=con["sort_order"],
                    constraint_text=con["constraint_text"],
                )
                db.add(constraint)

    if "hints" in payload:
        hints_data = payload.pop("hints")
        if hints_data is not None:
            for h in problem.hints:
                await db.delete(h)
            await db.flush()
            for h in hints_data:
                hint = ProblemHint(
                    problem_id=problem.id,
                    hint_num=h["hint_num"],
                    hint_text=h["hint_text"],
                )
                db.add(hint)

    if "code_snippets" in payload:
        snippets_data = payload.pop("code_snippets")
        if snippets_data is not None:
            for sn in problem.code_snippets:
                await db.delete(sn)
            await db.flush()
            for sn in snippets_data:
                snippet = CodeSnippet(
                    problem_id=problem.id,
                    language=sn["language"],
                    code=sn["code"],
                )
                db.add(snippet)

    # Update basic fields
    for field in ("title", "slug", "difficulty", "description"):
        if field in payload:
            setattr(problem, field, payload[field])

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Failed to update problem (conflict)") from exc
    await db.refresh(problem)
    return await get_problem_admin(db, problem.id)


async def delete_problem_admin(db: AsyncSession, problem_id: int) -> bool:
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if problem is None:
        return False
    await db.delete(problem)
    await db.commit()
    return True


# --- Topics ---


async def list_topics_admin(
    db: AsyncSession, search: Optional[str]
) -> list[AdminTopicItem]:
    base = select(
        Topic.id,
        Topic.name,
        Topic.slug,
        func.count(ProblemTopic.problem_id).label("problem_count"),
    ).outerjoin(ProblemTopic, ProblemTopic.topic_id == Topic.id).group_by(
        Topic.id, Topic.name, Topic.slug
    )
    if search:
        base = base.where(
            or_(Topic.name.ilike(f"%{search}%"), Topic.slug.ilike(f"%{search}%"))
        )
    base = base.order_by(Topic.name.asc())
    result = await db.execute(base)
    rows = result.all()
    return [
        AdminTopicItem(
            id=row.id,
            name=row.name,
            slug=row.slug,
            problem_count=row.problem_count or 0,
        )
        for row in rows
    ]


async def create_topic_admin(
    db: AsyncSession, data: AdminTopicCreate
) -> AdminTopicItem:
    name = data.name.strip()
    slug = (data.slug or _slugify_topic(name)).strip()
    if not slug:
        slug = _slugify_topic(name)
    topic = Topic(name=name, slug=slug)
    db.add(topic)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Topic with this name or slug already exists") from exc
    await db.refresh(topic)
    return AdminTopicItem(
        id=topic.id, name=topic.name, slug=topic.slug, problem_count=0
    )


async def update_topic_admin(
    db: AsyncSession, topic_id: int, data: AdminTopicUpdate
) -> Optional[AdminTopicItem]:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if topic is None:
        return None

    payload = data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"]:
        topic.name = payload["name"].strip()
    if "slug" in payload and payload["slug"]:
        topic.slug = payload["slug"].strip()
    elif "name" in payload:
        # Re-derive slug if only name changes and slug was not touched.
        topic.slug = _slugify_topic(topic.name)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ValueError("Failed to update topic (conflict)") from exc
    await db.refresh(topic)

    count_result = await db.execute(
        select(func.count(ProblemTopic.problem_id)).where(
            ProblemTopic.topic_id == topic_id
        )
    )
    problem_count = count_result.scalar() or 0
    return AdminTopicItem(
        id=topic.id,
        name=topic.name,
        slug=topic.slug,
        problem_count=problem_count,
    )


async def delete_topic_admin(db: AsyncSession, topic_id: int) -> bool:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if topic is None:
        return False
    try:
        await db.delete(topic)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return False
    return True


# --- Users (read-only) ---


async def list_users_admin(
    db: AsyncSession, search: Optional[str], is_active: Optional[bool]
) -> list[AdminUserItem]:
    base = select(
        User.id,
        User.username,
        User.email,
        User.is_active,
        User.is_admin,
        User.created_at,
        User.updated_at,
        func.count(Submission.id).label("submission_count"),
    ).outerjoin(Submission, Submission.user_id == User.id).group_by(
        User.id,
        User.username,
        User.email,
        User.is_active,
        User.is_admin,
        User.created_at,
        User.updated_at,
    )

    if search:
        pattern = f"%{search}%"
        base = base.where(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    if is_active is not None:
        base = base.where(User.is_active == is_active)

    base = base.order_by(User.created_at.desc())
    result = await db.execute(base)
    rows = result.all()
    return [
        AdminUserItem(
            id=row.id,
            username=row.username,
            email=row.email,
            is_active=row.is_active,
            is_admin=row.is_admin,
            created_at=row.created_at,
            updated_at=row.updated_at,
            submission_count=row.submission_count or 0,
        )
        for row in rows
    ]


# --- Submissions (read-only) ---


async def list_submissions_admin(
    db: AsyncSession,
    status: Optional[str],
    problem_id: Optional[int],
    user_id: Optional[int],
    limit: int,
    offset: int,
) -> tuple[list[AdminSubmissionItem], int]:
    base = (
        select(Submission, User.username, Problem.slug, Problem.title)
        .outerjoin(User, User.id == Submission.user_id)
        .outerjoin(Problem, Problem.id == Submission.problem_id)
    )
    count_q = select(func.count(Submission.id))

    filters = []
    if status:
        filters.append(Submission.status == status)
    if problem_id is not None:
        filters.append(Submission.problem_id == problem_id)
    if user_id is not None:
        filters.append(Submission.user_id == user_id)

    if filters:
        base = base.where(and_(*filters))
        count_q = count_q.where(and_(*filters))

    base = (
        base.order_by(Submission.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(base)
    rows = result.all()
    total = (await db.execute(count_q)).scalar() or 0

    items: list[AdminSubmissionItem] = []
    for row in rows:
        submission: Submission = row[0]
        username: Optional[str] = row[1]
        problem_slug: Optional[str] = row[2]
        problem_title: Optional[str] = row[3]
        items.append(
            AdminSubmissionItem(
                id=submission.id,
                user_id=submission.user_id,
                username=username,
                problem_id=submission.problem_id,
                problem_slug=problem_slug,
                problem_title=problem_title,
                language=submission.language,
                status=submission.status,
                execution_time_ms=submission.execution_time_ms,
                memory_used_kb=submission.memory_used_kb,
                created_at=submission.created_at,
            )
        )
    return items, total


# --- Stats ---


async def get_admin_stats(db: AsyncSession) -> AdminStats:
    problems = (await db.execute(select(func.count(Problem.id)))).scalar() or 0
    topics = (await db.execute(select(func.count(Topic.id)))).scalar() or 0
    users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    submissions = (
        await db.execute(select(func.count(Submission.id)))
    ).scalar() or 0
    return AdminStats(
        problems=problems,
        topics=topics,
        users=users,
        submissions=submissions,
    )


# Colors used by frontend charts. Keep keys stable.
_DIFFICULTY_COLORS = {
    "Easy": "hsl(142, 71%, 45%)",
    "Medium": "hsl(38, 92%, 50%)",
    "Hard": "hsl(0, 84%, 60%)",
}

_STATUS_COLORS = {
    "Accepted": "hsl(142, 71%, 45%)",
    "Wrong Answer": "hsl(0, 84%, 60%)",
    "Time Limit Exceeded": "hsl(38, 92%, 50%)",
    "Runtime Error": "hsl(20, 90%, 55%)",
    "Compilation Error": "hsl(220, 14%, 46%)",
}


async def get_extended_admin_stats(db: AsyncSession) -> AdminExtendedStats:
    base = await get_admin_stats(db)

    # difficulty distribution
    diff_rows = (
        await db.execute(
            select(Problem.difficulty, func.count(Problem.id)).group_by(
                Problem.difficulty
            )
        )
    ).all()
    diff_map = {row[0]: int(row[1] or 0) for row in diff_rows}
    difficulty_distribution = [
        DistributionItem(
            label=d,
            value=diff_map.get(d, 0),
            color=_DIFFICULTY_COLORS.get(d),
        )
        for d in ("Easy", "Medium", "Hard")
    ]

    # submission status distribution (top 8)
    status_rows = (
        await db.execute(
            select(Submission.status, func.count(Submission.id))
            .group_by(Submission.status)
            .order_by(func.count(Submission.id).desc())
            .limit(8)
        )
    ).all()
    status_distribution = [
        DistributionItem(
            label=row[0] or "Unknown",
            value=int(row[1] or 0),
            color=_STATUS_COLORS.get(row[0] or ""),
        )
        for row in status_rows
    ]

    # error label distribution (from submission_error_events)
    _ERROR_LABEL_COLORS: dict[str, str] = {
        "logic_calculation_error": "hsl(210, 80%, 55%)",
        "complexity_error": "hsl(38, 92%, 50%)",
        "memory_reference_error": "hsl(340, 75%, 55%)",
        "recursion_error": "hsl(280, 60%, 55%)",
        "algorithm_design_error": "hsl(160, 60%, 45%)",
        "boundary_condition_error": "hsl(30, 90%, 55%)",
    }
    error_rows = (
        await db.execute(
            select(SubmissionErrorEvent.error_label, func.count(SubmissionErrorEvent.id))
            .group_by(SubmissionErrorEvent.error_label)
            .order_by(func.count(SubmissionErrorEvent.id).desc())
            .limit(10)
        )
    ).all()
    error_label_distribution = [
        DistributionItem(
            label=DIAGNOSIS_LABELS.get(
                CanonicalErrorLabel(row[0]), row[0] or "Unknown"
            ),
            value=int(row[1] or 0),
            color=_ERROR_LABEL_COLORS.get(row[0] or ""),
        )
        for row in error_rows
    ]

    # top topics (by problem_count)
    top_topics_rows = (
        await db.execute(
            select(
                Topic.id,
                Topic.name,
                Topic.slug,
                func.count(ProblemTopic.problem_id).label("problem_count"),
            )
            .outerjoin(ProblemTopic, ProblemTopic.topic_id == Topic.id)
            .group_by(Topic.id, Topic.name, Topic.slug)
            .order_by(func.count(ProblemTopic.problem_id).desc())
            .limit(5)
        )
    ).all()
    top_topics = [
        AdminTopicItem(
            id=row.id,
            name=row.name,
            slug=row.slug,
            problem_count=row.problem_count or 0,
        )
        for row in top_topics_rows
    ]

    # recent problems (last 5)
    recent_problems_rows = (
        await db.execute(
            select(Problem)
            .options(selectinload(Problem.topics))
            .order_by(Problem.created_at.desc())
            .limit(5)
        )
    ).scalars().unique().all()
    recent_problems = [
        AdminProblemListItem(
            id=p.id,
            problem_id=p.problem_id,
            frontend_id=p.frontend_id,
            title=p.title,
            slug=p.slug,
            difficulty=p.difficulty,
            topics=[
                TopicResponse(id=t.id, name=t.name, slug=t.slug) for t in p.topics
            ],
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in recent_problems_rows
    ]

    # recent submissions (last 5) with joined problem/user
    recent_sub_rows = (
        await db.execute(
            select(Submission, User.username, Problem.slug, Problem.title)
            .outerjoin(User, User.id == Submission.user_id)
            .outerjoin(Problem, Problem.id == Submission.problem_id)
            .order_by(Submission.created_at.desc())
            .limit(5)
        )
    ).all()
    recent_submissions: list[AdminSubmissionItem] = []
    for row in recent_sub_rows:
        sub: Submission = row[0]
        recent_submissions.append(
            AdminSubmissionItem(
                id=sub.id,
                user_id=sub.user_id,
                username=row[1],
                problem_id=sub.problem_id,
                problem_slug=row[2],
                problem_title=row[3],
                language=sub.language,
                status=sub.status,
                execution_time_ms=sub.execution_time_ms,
                memory_used_kb=sub.memory_used_kb,
                created_at=sub.created_at,
            )
        )

    # user counters
    active_users = (
        await db.execute(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )
    ).scalar() or 0
    admin_users = (
        await db.execute(
            select(func.count(User.id)).where(User.is_admin.is_(True))
        )
    ).scalar() or 0

    return AdminExtendedStats(
        problems=base.problems,
        topics=base.topics,
        users=base.users,
        submissions=base.submissions,
        active_users=active_users,
        admin_users=admin_users,
        difficulty_distribution=difficulty_distribution,
        status_distribution=status_distribution,
        error_label_distribution=error_label_distribution,
        top_topics=top_topics,
        recent_problems=recent_problems,
        recent_submissions=recent_submissions,
    )
