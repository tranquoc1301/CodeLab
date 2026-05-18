from fastapi import APIRouter

from app.api.v1.endpoints import auth, problem_lists, problems, profile, submissions

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(problems.router, tags=["problems"])
api_router.include_router(submissions.router, tags=["submissions"])
api_router.include_router(problem_lists.router, tags=["problem-lists"])
api_router.include_router(profile.router, tags=["profile"])
