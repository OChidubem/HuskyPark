from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL
    postgres_user: str = "huskypark"
    postgres_password: str = "changeme"
    postgres_db: str = "huskypark_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # MongoDB
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "huskypark_mongo"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # OpenAI
    openai_api_key: str = ""

    # Weather
    openweather_api_key: str = ""
    openweather_lat: float = 45.5598
    openweather_lon: float = -94.1512

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def asyncpg_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
