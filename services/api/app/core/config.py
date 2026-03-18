from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str
    secret_key: str

    meilisearch_url: str
    meilisearch_key: str

    keycloak_url: str
    keycloak_realm: str
    keycloak_client_id: str

    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket_evidence: str = "evidence"


settings = Settings()
