import csv
import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth import create_token
from app.database import Base, get_db
from app.main import app
@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def create_user(client: TestClient, email: str, name: str = "Test User") -> tuple[int, str]:
    response = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "test-password-123"},
    )
    assert response.status_code == 201
    data = response.json()
    return data["user"]["id"], data["access_token"]


def test_register_and_get_current_user(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={"name": "  Alice Example  ", "email": "Alice@example.com", "password": "test-password-123"},
    )

    assert response.status_code == 201
    token = response.json()["access_token"]
    current = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert current.status_code == 200
    assert current.json()["name"] == "Alice Example"
    assert current.json()["email"] == "alice@example.com"


def test_users_cannot_read_or_modify_another_users_expenses(client: TestClient):
    _, owner_token = create_user(client, "owner@example.com")
    _, other_token = create_user(client, "other@example.com")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    other_headers = {"Authorization": f"Bearer {other_token}"}
    created = client.post(
        "/api/expenses",
        headers=owner_headers,
        json={"title": "Lunch", "amount": 12.5, "category": "Food", "date": "2026-10-01"},
    )
    expense_id = created.json()["id"]

    assert created.status_code == 201
    assert client.get("/api/expenses", headers=other_headers).json()["items"] == []
    assert client.put(
        f"/api/expenses/{expense_id}",
        headers=other_headers,
        json={"title": "Changed", "amount": 12.5, "category": "Food", "date": "2026-10-01"},
    ).status_code == 404
    assert client.delete(f"/api/expenses/{expense_id}", headers=other_headers).status_code == 404


def test_budget_warning_and_csv_formula_protection(client: TestClient):
    _, token = create_user(client, "budget@example.com", name="=1+1")
    headers = {"Authorization": f"Bearer {token}"}
    client.put("/api/budgets", headers=headers, json={"category": "Food", "amount": 100, "month": "2026-10"})
    client.post(
        "/api/expenses",
        headers=headers,
        json={
            "title": "=HYPERLINK(\"https://example.invalid\")",
            "amount": 80,
            "category": "Food",
            "date": "2026-10-01",
            "note": " @SUM(1,1)",
        },
    )

    budgets = client.get("/api/budgets?month=2026-10", headers=headers)
    assert budgets.status_code == 200
    assert budgets.json()["budgets"][0]["status"] == "warning"

    report = client.get("/api/reports/expenses.csv?month=2026-10", headers=headers)
    assert report.status_code == 200
    rows = list(csv.reader(io.StringIO(report.content.decode("utf-8-sig"))))
    assert rows[1][1].startswith("'=")
    assert rows[1][4].startswith("' ")

    monthly = client.get("/api/reports/monthly.csv?month=2026-10", headers=headers)
    assert monthly.status_code == 200
    monthly_rows = list(csv.reader(io.StringIO(monthly.content.decode("utf-8-sig"))))
    assert monthly_rows[1][1] == "'=1+1"
    assert any(row[1].startswith("'=") for row in monthly_rows if len(row) > 1)


def test_protected_endpoints_require_authentication(client: TestClient):
    assert client.get("/api/expenses").status_code == 401


def test_registration_rejects_blank_names_and_short_passwords(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={"name": "   ", "email": "blank@example.com", "password": "short"},
    )
    assert response.status_code == 422

    response = client.post(
        "/api/auth/register",
        json={"name": "Valid Name", "email": "short@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_read_only_demo_rejects_every_write_route(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    _, token = create_user(client, "readonly@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    monkeypatch.setattr("app.services.READ_ONLY_DEMO", True)
    expense = {"title": "Lunch", "amount": 12.5, "category": "Food", "date": "2026-10-01"}
    income = {"source": "Job", "amount": 100, "date": "2026-10-01"}
    budget = {"category": "Food", "amount": 100, "month": "2026-10"}

    assert client.post(
        "/api/auth/register",
        json={"name": "New User", "email": "new@example.com", "password": "test-password-123"},
    ).status_code == 403
    assert client.post("/api/income", headers=headers, json=income).status_code == 403
    assert client.put("/api/income/1", headers=headers, json=income).status_code == 403
    assert client.delete("/api/income/1", headers=headers).status_code == 403
    assert client.post("/api/expenses", headers=headers, json=expense).status_code == 403
    assert client.put("/api/expenses/1", headers=headers, json=expense).status_code == 403
    assert client.delete("/api/expenses/1", headers=headers).status_code == 403
    assert client.put("/api/budgets", headers=headers, json=budget).status_code == 403
    assert client.delete("/api/budgets/1", headers=headers).status_code == 403


def test_public_users_can_save_data_but_shared_demo_account_is_read_only(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    _, demo_token = create_user(client, "demo@budgetdekho.in", "Demo Account")
    _, user_token = create_user(client, "personal@example.com", "Personal Account")
    monkeypatch.setattr("app.services.READ_ONLY_DEMO", False)
    expense = {"title": "Lunch", "amount": 12.5, "category": "Food", "date": "2026-10-01"}

    registered = client.post(
        "/api/auth/register",
        json={"name": "New Public User", "email": "new-public@example.com", "password": "test-password-123"},
    )
    assert registered.status_code == 201

    saved = client.post(
        "/api/expenses",
        headers={"Authorization": f"Bearer {user_token}"},
        json=expense,
    )
    assert saved.status_code == 201
    assert saved.json()["title"] == "Lunch"

    demo_write = client.post(
        "/api/expenses",
        headers={"Authorization": f"Bearer {demo_token}"},
        json=expense,
    )
    assert demo_write.status_code == 403
    assert "shared sample account is read-only" in demo_write.json()["detail"]


def test_transaction_lists_are_paginated(client: TestClient):
    _, token = create_user(client, "pages@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    for day in range(1, 4):
        response = client.post(
            "/api/income",
            headers=headers,
            json={"source": f"Job {day}", "amount": 100, "date": f"2026-10-0{day}"},
        )
        assert response.status_code == 201

    first_page = client.get("/api/income?page=1&page_size=2", headers=headers)
    second_page = client.get("/api/income?page=2&page_size=2", headers=headers)
    assert first_page.status_code == 200
    assert first_page.json()["total"] == 3
    assert len(first_page.json()["items"]) == 2
    assert len(second_page.json()["items"]) == 1
    assert client.get("/api/income?page_size=101", headers=headers).status_code == 422


def test_money_inputs_allow_only_two_decimal_places(client: TestClient):
    _, token = create_user(client, "precision@example.com")
    response = client.post(
        "/api/expenses",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Too precise", "amount": 1.234, "category": "Food", "date": "2026-10-01"},
    )
    assert response.status_code == 422
