from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairox"
    DEBUG: bool = True
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/kairox"
    SECRET_KEY: str = "Your+secret+key"
    ALGORITHM: str = "Algorithm"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()