import os
import sqlite3
import subprocess
import sys
from pathlib import Path


def test_initial_database_migration_preserves_and_rounds_existing_amounts(tmp_path: Path):
    backend_dir = Path(__file__).resolve().parents[1]
    database_url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    env = os.environ.copy()
    env.update(APP_ENV="development", DATABASE_URL=database_url)

    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "0001_initial"],
        cwd=backend_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    with sqlite3.connect(tmp_path / "migration.db") as connection:
        connection.execute(
            "INSERT INTO users (id, name, email, hashed_password, created_at) "
            "VALUES (1, 'Migration test', 'migration@example.com', 'not-used', '2026-01-01 00:00:00')"
        )
        connection.execute(
            "INSERT INTO income (user_id, source, amount, date) VALUES (1, 'Salary', 12.345, '2026-01-01')"
        )
        connection.execute(
            "INSERT INTO expenses (user_id, title, amount, category, date) "
            "VALUES (1, 'Lunch', 9.995, 'Food', '2026-01-01')"
        )
        connection.execute(
            "INSERT INTO budgets (user_id, category, amount, month) VALUES (1, 'Food', 20.005, '2026-01')"
        )
        connection.commit()

    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    with sqlite3.connect(tmp_path / "migration.db") as connection:
        amounts = [
            connection.execute(f"SELECT amount FROM {table}").fetchone()[0]
            for table in ("income", "expenses", "budgets")
        ]
    assert [round(float(amount), 2) for amount in amounts] == [12.35, 10.0, 20.01]
