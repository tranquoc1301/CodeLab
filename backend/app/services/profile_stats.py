from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem, ProblemTopic, Topic
from app.models.submission import Submission
from app.schemas.profile_stats import DifficultyStats, ProfileStatsResponse, SkillStat

DIFFICULTIES = ("Easy", "Medium", "Hard")


async def get_profile_stats(db: AsyncSession, user_id: int) -> ProfileStatsResponse:
    # Total problems per difficulty
    total_q = select(Problem.difficulty, func.count(Problem.id)).group_by(
        Problem.difficulty
    )
    total_rows = (await db.execute(total_q)).all()
    total_map = {row[0]: row[1] for row in total_rows}

    # Solved problems per difficulty (distinct problem_id with Accepted)
    solved_q = (
        select(Problem.difficulty, func.count(func.distinct(Submission.problem_id)))
        .join(Problem, Submission.problem_id == Problem.id)
        .where(Submission.user_id == user_id, Submission.status == "Accepted")
        .group_by(Problem.difficulty)
    )
    solved_rows = (await db.execute(solved_q)).all()
    solved_map = {row[0]: row[1] for row in solved_rows}

    stats = {}
    for diff in DIFFICULTIES:
        stats[diff] = DifficultyStats(
            solved=solved_map.get(diff, 0),
            total=total_map.get(diff, 0),
        )

    # Solved problems per topic
    skills_q = (
        select(Topic.slug, func.count(func.distinct(Submission.problem_id)))
        .join(ProblemTopic, ProblemTopic.topic_id == Topic.id)
        .join(Submission, Submission.problem_id == ProblemTopic.problem_id)
        .where(Submission.user_id == user_id, Submission.status == "Accepted")
        .group_by(Topic.slug)
        .order_by(func.count(func.distinct(Submission.problem_id)).desc())
    )
    skills = [SkillStat(slug=row[0], count=row[1]) for row in (await db.execute(skills_q)).all()]

    return ProfileStatsResponse(
        easy=stats["Easy"],
        medium=stats["Medium"],
        hard=stats["Hard"],
        total_solved=sum(s.solved for s in stats.values()),
        total_problems=sum(s.total for s in stats.values()),
        skills=skills,
    )
