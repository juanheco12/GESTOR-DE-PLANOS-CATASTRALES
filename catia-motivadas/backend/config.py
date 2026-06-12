from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "sqlite:///./catia.db"
    environment: str = "development"
    templates_dir: str = "./storage/templates"
    outputs_dir: str = "./storage/outputs"

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure storage dirs exist at import time
Path(settings.templates_dir).mkdir(parents=True, exist_ok=True)
Path(settings.outputs_dir).mkdir(parents=True, exist_ok=True)
