from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairox"
    DEBUG: bool = True
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/kairox"
    SECRET_KEY: str = "Your+secret+key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 10
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()