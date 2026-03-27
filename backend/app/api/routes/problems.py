from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.problem import Problem
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemResponse
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemResponse])
async def list_problems(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).order_by(Problem.id))
    return result.scalars().all()


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(problem_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = Problem(**problem_data.model_dump())
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem
