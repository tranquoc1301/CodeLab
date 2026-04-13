from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_db, get_current_user
from app.models import User, ProblemList, Problem, ProblemListItem
from app.schemas.problem_list import (
    ProblemListCreate,
    ProblemListUpdate,
    ProblemListResponse,
    ProblemListProblemsResponse,
    ProblemListSimple,
)

router = APIRouter(prefix="/problem-lists", tags=["problem-lists"])


@router.get("", response_model=list[ProblemListResponse])
async def list_problem_lists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProblemList]:
    """List all problem lists for the current user."""
    result = await db.execute(
        select(ProblemList)
        .options(selectinload(ProblemList.items))
        .where(ProblemList.user_id == current_user.id)
    )
    lists = result.scalars().all()
    return lists


@router.post(
    "", response_model=ProblemListResponse, status_code=status.HTTP_201_CREATED
)
async def create_problem_list(
    list_data: ProblemListCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemList:
    """Create a new problem list."""
    problem_list = ProblemList(
        name=list_data.name,
        description=list_data.description,
        user_id=current_user.id,
    )
    db.add(problem_list)
    await db.commit()
    await db.refresh(problem_list)
    return problem_list


@router.get("/{list_id}", response_model=ProblemListResponse)
async def get_problem_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemList:
    """Get a specific problem list by ID."""
    result = await db.execute(
        select(ProblemList)
        .options(selectinload(ProblemList.items))
        .where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem list not found",
        )
    return problem_list


@router.patch("/{list_id}", response_model=ProblemListResponse)
async def update_problem_list(
    list_id: int,
    list_data: ProblemListUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemList:
    """Update a problem list."""
    result = await db.execute(
        select(ProblemList)
        .options(selectinload(ProblemList.items))
        .where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem list not found",
        )

    # Update only provided fields
    if list_data.name is not None:
        problem_list.name = list_data.name
    if list_data.description is not None:
        problem_list.description = list_data.description

    await db.commit()
    await db.refresh(problem_list)
    return problem_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem_list(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a problem list."""
    result = await db.execute(
        select(ProblemList).where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem list not found",
        )

    await db.delete(problem_list)
    await db.commit()


@router.post("/{list_id}/problems/{problem_id}", status_code=status.HTTP_201_CREATED)
async def add_problem_to_list(
    list_id: int,
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a problem to a problem list."""
    # Check list belongs to user and exists
    result = await db.execute(
        select(ProblemList).where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    # Check problem exists
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )

    # Check if already in list
    result = await db.execute(
        select(ProblemListItem).where(
            ProblemListItem.problem_list_id == list_id,
            ProblemListItem.problem_id == problem_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Problem already in list",
        )

    # Add to list
    item = ProblemListItem(problem_list_id=list_id, problem_id=problem_id)
    db.add(item)
    await db.commit()
    return {"message": "Problem added to list"}


@router.delete(
    "/{list_id}/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_problem_from_list(
    list_id: int,
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a problem from a problem list."""
    # Check list belongs to user and exists
    result = await db.execute(
        select(ProblemList).where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    # Check if problem is in list
    result = await db.execute(
        select(ProblemListItem).where(
            ProblemListItem.problem_list_id == list_id,
            ProblemListItem.problem_id == problem_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found in list",
        )

    await db.delete(item)
    await db.commit()


@router.get("/{list_id}/problems", response_model=ProblemListProblemsResponse)
async def get_list_problems(
    list_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProblemListProblemsResponse:
    """Get all problems in a list."""
    # Check list belongs to user and exists
    result = await db.execute(
        select(ProblemList).where(
            ProblemList.id == list_id,
            ProblemList.user_id == current_user.id,
        )
    )
    problem_list = result.scalar_one_or_none()
    if not problem_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem list not found",
        )

    # Get all problems in the list with their relationships
    result = await db.execute(
        select(Problem)
        .join(ProblemListItem, ProblemListItem.problem_id == Problem.id)
        .where(ProblemListItem.problem_list_id == list_id)
        .order_by(ProblemListItem.created_at.desc())
    )
    problems = result.scalars().all()

    return ProblemListProblemsResponse(
        problems=[p.to_summary() for p in problems],
        total_count=len(problems),
    )


@router.get("/problems/{problem_id}/problem-lists", response_model=list[ProblemListSimple])
async def get_lists_containing_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProblemListSimple]:
    """Get all problem lists that contain a specific problem."""
    # Check problem exists
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )

    # Get all lists belonging to user that contain this problem
    result = await db.execute(
        select(ProblemList)
        .join(ProblemListItem, ProblemListItem.problem_list_id == ProblemList.id)
        .where(
            ProblemList.user_id == current_user.id,
            ProblemListItem.problem_id == problem_id,
        )
    )
    lists = result.scalars().all()

    return [ProblemListSimple(id=list.id, name=list.name) for list in lists]
