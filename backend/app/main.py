from fastapi import FastAPI
from app.config import settings

app = FastAPI(title=settings.APP_NAME, description="AI Workflow Automation Assistant", version="0.1.0",)

@app.get("/health")
async def health_check():
    return {"status": "ok",
    "app_name": settings.APP_NAME,
    "app_version": settings.APP_VERSION,
    "debug": settings.DEBUG
    }