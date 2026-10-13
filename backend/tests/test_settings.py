import os
import subprocess
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]


def run_settings(
    env_overrides: dict[str, str | None],
    code: str = "import app.settings",
) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    for key in ("APP_ENV", "SECRET_KEY", "DATABASE_URL", "CORS_ORIGINS"):
        env.pop(key, None)
    for key, value in env_overrides.items():
        if value is not None:
            env[key] = value
    return subprocess.run(
        [sys.executable, "-c", code],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def test_production_requires_a_strong_secret_database_and_https_origin():
    missing_secret = run_settings(
        {"APP_ENV": "production", "DATABASE_URL": "sqlite:///./budgetdekho.db", "CORS_ORIGINS": "https://app.example"}
    )
    assert missing_secret.returncode != 0
    assert "requires a SECRET_KEY" in missing_secret.stderr

    insecure_origin = run_settings(
        {
            "APP_ENV": "production",
            "SECRET_KEY": "a" * 48,
            "DATABASE_URL": "postgresql://user:pass@db.example:5432/budget",
            "CORS_ORIGINS": "http://app.example",
        }
    )
    assert insecure_origin.returncode != 0
    assert "must contain HTTPS origins" in insecure_origin.stderr


def test_production_rejects_sqlite_databases():
    result = run_settings(
        {
            "APP_ENV": "production",
            "SECRET_KEY": "a" * 48,
            "DATABASE_URL": "sqlite:///./budgetdekho.db",
            "CORS_ORIGINS": "https://app.example",
        }
    )
    assert result.returncode != 0
    assert "must point to PostgreSQL" in result.stderr


def test_postgres_connection_urls_use_the_installed_psycopg_driver():
    result = run_settings(
        {
            "APP_ENV": "production",
            "SECRET_KEY": "a" * 48,
            "DATABASE_URL": "postgresql://user:pass@db.example:5432/budget",
            "CORS_ORIGINS": "https://app.example",
        },
        "from app.settings import DATABASE_URL; print(DATABASE_URL)",
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "postgresql+psycopg://user:pass@db.example:5432/budget"
