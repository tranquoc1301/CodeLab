from pydantic import BaseModel


class DifficultyStats(BaseModel):
    solved: int
    total: int


class SkillStat(BaseModel):
    slug: str
    count: int


class ProfileStatsResponse(BaseModel):
    easy: DifficultyStats
    medium: DifficultyStats
    hard: DifficultyStats
    total_solved: int
    total_problems: int
    skills: list[SkillStat] = []
