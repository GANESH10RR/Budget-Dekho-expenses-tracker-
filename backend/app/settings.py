import os
from urllib.parse import urlsplit


APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
if APP_ENV not in {"development", "production"}:
    raise RuntimeError("APP_ENV must be either 'development' or 'production'.")

SECRET_KEY = os.getenv("SECRET_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
cors_origins = os.getenv("CORS_ORIGINS")
demo_mode = os.getenv("READ_ONLY_DEMO", "false").strip().lower()
if demo_mode not in {"true", "false"}:
    raise RuntimeError("READ_ONLY_DEMO must be either 'true' or 'false'.")
READ_ONLY_DEMO = demo_mode == "true"

if APP_ENV == "production":
    if not SECRET_KEY or not SECRET_KEY.strip() or len(SECRET_KEY) < 32:
        raise RuntimeError("Production requires a SECRET_KEY of at least 32 characters.")
    if not DATABASE_URL:
        raise RuntimeError("Production requires DATABASE_URL to be configured.")
    if not DATABASE_URL.startswith(("postgres://", "postgresql://", "postgresql+psycopg://")):
        raise RuntimeError("Production DATABASE_URL must point to PostgreSQL; SQLite is development-only.")
    if not cors_origins:
        raise RuntimeError("Production requires CORS_ORIGINS to be configured.")
    CORS_ORIGINS = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    if not CORS_ORIGINS or "*" in CORS_ORIGINS:
        raise RuntimeError("Production CORS_ORIGINS must list explicit frontend origins.")
    parsed_origins = [urlsplit(origin) for origin in CORS_ORIGINS]
    if any(
        parsed.scheme != "https"
        or not parsed.netloc
        or parsed.path
        or parsed.query
        or parsed.fragment
        for parsed in parsed_origins
    ):
        raise RuntimeError("Production CORS_ORIGINS must contain HTTPS origins without paths.")
else:
    SECRET_KEY = SECRET_KEY or "development-only-secret-do-not-use-in-production"
    DATABASE_URL = DATABASE_URL or "sqlite:///./budgetdekho.db"
    CORS_ORIGINS = (
        [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
        if cors_origins
        else ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
