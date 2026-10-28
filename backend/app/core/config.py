from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Kairox"
    DEBUG: bool = True
    APP_VERSION: str = "0.1.0"

    # AI configuration
    AI_PROVIDER: str = "ollama"
    MODEL: str = "qwen3:8b"
    API_URL: str = "http://localhost:11434/api/chat"
    API_KEY: str = ""

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/kairox"

    # Authentication
    SECRET_KEY: str = "Your+secret+key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
