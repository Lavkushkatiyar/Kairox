from contextlib import asynccontextmanager

from app.api.v1.router import router as api_router
from app.cache.redis_client import close_redis, get_redis, init_redis
from app.db.session import get_db
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()

    yield

    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI Workflow Automation Assistant",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to Kairox API"}


@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    return {"db": "connected"}


print(settings.DATABASE_URL)


@app.get("/health")
async def health_check():
    redis_ok = False

    try:
        redis_client = await get_redis()
        await redis_client.ping()
        redis_ok = True
    except Exception:
        pass

    return {
        "status": "ok" if redis_ok else "degraded",
        "services": {
            "api": True,
            "redis": redis_ok,
        },
    }


app.include_router(api_router, prefix="/api/v1")
