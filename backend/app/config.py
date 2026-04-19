from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairox"
    DEBUG: bool = True
    APP_VERSION: str = "0.1.0"

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/kairox"
   
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()