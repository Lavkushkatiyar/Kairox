from fastapi import FastAPI, Depends
from app.config import settings 
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.api.v1.router import router as api_router

app = FastAPI(title=settings.APP_NAME, description="AI Workflow Automation Assistant", version="0.1.0",)


@app.get("/")
def root():
    return {"message": "Welcome to Kairox API"}

@app.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    return {"db": "connected"}

print(settings.DATABASE_URL)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(api_router, prefix="/api/v1")