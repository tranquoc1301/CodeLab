import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/coding_platform")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
JUDGE0_URL = os.getenv("JUDGE0_URL", "https://ce.judge0.com")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
ALGORITHM = "HS256"
