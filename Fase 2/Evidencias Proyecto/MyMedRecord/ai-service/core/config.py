import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MyMedRecord AI Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Restringir CORS solo para backend-core (aislamiento)
    BACKEND_CORE_ORIGIN: str = os.getenv("BACKEND_CORE_ORIGIN", "http://localhost:5000")

    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.0-flash")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()