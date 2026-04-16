from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "MK Logistic Web"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: Optional[str] = None
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "mk_logistic"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # JWT
    SECRET_KEY: str = "change-me-in-production-at-least-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080   # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Email (Yandex SMTP)
    SMTP_HOST: str = "smtp.yandex.ru"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "МК Логистик <noreply@mk-logistic.ru>"

    # YooKassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_WEBHOOK_SECRET: str = ""

    # App URLs
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8001"

    # Manager notification emails (comma-separated)
    MANAGER_EMAILS: str = ""

    # Admin telegram IDs (for cross-compatibility with bot)
    ADMIN_TG_IDS: str = ""

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def manager_email_list(self) -> List[str]:
        return [e.strip() for e in self.MANAGER_EMAILS.split(",") if e.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
