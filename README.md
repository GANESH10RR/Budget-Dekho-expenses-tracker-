# BudgetDekho

BudgetDekho is a full-stack personal-finance app for recording income and expenses, setting monthly category budgets, and understanding spending through a dashboard, charts, plain-language insights, and downloadable CSV reports.

> **Demo and safety notice:** The included Render Blueprint is a read-only, sample-data demo. Its shared demo credentials are public by design. Do not enter or store real financial or personal information in the public demo. It uses free hosting and a free managed PostgreSQL database, which has important availability and data-retention limits. This project is not yet ready to handle real users' financial data.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Project layout](#project-layout)
- [Run locally](#run-locally)
- [Database and migrations](#database-and-migrations)
- [Tests and CI](#tests-and-ci)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Deploy the sample demo to Render](#deploy-the-sample-demo-to-render)
- [Configuration reference](#configuration-reference)
- [Current limitations and before-production checklist](#current-limitations-and-before-production-checklist)
- [Troubleshooting](#troubleshooting)

## Features

- Register and log in; passwords are stored as bcrypt hashes and API access uses 24-hour JWTs.
- Record, edit, delete, search, and filter income and expenses.
- Categorize expenses and page through large transaction lists.
- Set a monthly limit per category and receive warnings at 80% and 100% of that limit.
- View monthly income, expenses, savings, balance, recent transactions, category breakdowns, and six-month trends.
- Generate rule-based spending insights and suggestions.
- Download expense lists and monthly summaries as CSV. User-entered text is escaped to reduce spreadsheet-formula risks.
- Scope financial records to the authenticated account.
- Use SQLite for local development and PostgreSQL for production deployments; manage schema changes with Alembic.
- Run backend tests and a frontend production build through GitHub Actions.
- Optionally start a read-only public demo populated with synthetic transactions.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, JavaScript, Vite, React Router, Axios, Tailwind CSS, Recharts |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy |
| Database | SQLite for local development; PostgreSQL via Psycopg for hosted environments |
| Authentication | JWT (PyJWT), bcrypt password hashing |
| Schema migrations | Alembic |
| Tests | pytest, FastAPI TestClient, HTTPX |
| Deployment and CI | Render Blueprint, GitHub Actions |

## Project layout

```text
BudgetDekho/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Backend tests and frontend build on pushes/PRs
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, API routes, health endpoint
│   │   ├── settings.py             # Environment configuration and production guards
│   │   ├── database.py             # SQLAlchemy engine and database sessions
│   │   ├── models.py               # User, income, expense, and budget tables
│   │   ├── schemas.py              # Request validation and response shapes
│   │   ├── auth.py                 # Password hashing, JWTs, authenticated-user dependency
│   │   ├── services.py             # Shared queries, budgets, and insights
│   │   └── routers/                # Auth, income, expenses, budgets, analytics, reports
│   ├── migrations/
│   │   └── versions/               # Versioned schema migrations
│   ├── tests/                      # API, settings, pagination, CSV, migration tests
│   ├── requirements.txt            # Runtime Python dependencies
│   ├── requirements-dev.txt        # Runtime + migration/test dependencies
│   ├── alembic.ini
│   └── seed.py                     # Optional synthetic demo account and data
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Login, dashboard, income, expenses, budgets, etc.
│   │   ├── components/             # Navigation, shared UI, forms
│   │   ├── context/AuthContext.jsx # Frontend account state
│   │   ├── api.js                  # Axios configuration and JWT request handling
│   │   └── config.js               # Public-demo UI flag
│   ├── .env.example                # Local API URL example
│   ├── package.json
│   └── package-lock.json
├── render.yaml                     # Read-only Render demo blueprint
└── README.md
```

## Run locally

Requirements: Python 3.10 or newer and Node.js 18 or newer.

### 1. Start the backend

Open a terminal in VS Code, then change to the `backend` directory.

**Windows PowerShell:**

```powershell
cd "C:\path\to\BudgetDekho\backend"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
alembic upgrade head
python seed.py
python -m uvicorn app.main:app --reload
```

If PowerShell blocks virtual-environment activation, allow scripts only for the current terminal process, then activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
cd /path/to/BudgetDekho/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
alembic upgrade head
python seed.py
python -m uvicorn app.main:app --reload
```

The API starts at `http://localhost:8000`. Interactive API documentation is at `http://localhost:8000/docs`; health status is available at `http://localhost:8000/api/health`.

`python seed.py` is optional. It creates a demo account (`demo@budgetdekho.in` / `demo1234`) and three months of synthetic transactions. If that demo account already exists, the script leaves the database unchanged.

### 2. Start the frontend

Open a **second terminal** in VS Code:

```powershell
cd "C:\path\to\BudgetDekho\frontend"
npm install
npm run dev
```

Or, on macOS/Linux:

```bash
cd /path/to/BudgetDekho/frontend
npm install
npm run dev
```

Open the development URL Vite prints (normally `http://localhost:5173`). Both backend and frontend terminals need to stay open while you use the app.

To use a different API locally, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to the API base URL ending in `/api`. Vite reads frontend environment variables at build/start time; restart its development server after changing them.

## Database and migrations

- Local development defaults to `sqlite:///./budgetdekho.db`, relative to the backend working directory.
- Production requires `APP_ENV=production` and a PostgreSQL `DATABASE_URL`. The API normalizes standard `postgres://` and `postgresql://` URLs to use Psycopg.
- Database tables are created and changed by Alembic migrations, **not** automatically when the API starts.
- For a new database, run `alembic upgrade head` from `backend/` before starting the API.
- The initial migration creates users, income, expenses, and budgets. A later migration changes amounts to `NUMERIC(12, 2)` and rounds existing values to two decimal places.

If you already have a local database from before Alembic was introduced, back it up before migrating. Once a verified backup exists, mark the initial schema as already present and apply subsequent migrations:

```powershell
Copy-Item .\budgetdekho.db .\budgetdekho-before-migrations.db
alembic stamp 0001_initial
alembic upgrade head
```

Only run the `stamp` command against a database that already has the original BudgetDekho tables. For a new/empty database, use `alembic upgrade head` directly.

## Tests and CI

From the `backend` directory, install development dependencies and run the API and migration tests:

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

The tests cover registration and login-related validation, authorization, user-to-user data isolation, read-only demo behavior, fixed-precision amount validation, pagination, budget alerts, CSV formula escaping, production configuration guards, and migration/data preservation.

The workflow in `.github/workflows/ci.yml` runs the backend tests and builds the frontend for pushes and pull requests.

To build the frontend locally:

```powershell
cd ..\frontend
npm ci
npm run build
```

The build may print a warning about a JavaScript bundle larger than 500 kB; this is currently a performance optimization warning, not a build failure.

## API reference

All routes under `/api` require an `Authorization: Bearer <access_token>` header **except** registration and login. Month filters use `YYYY-MM`. For full request schemas and interactive testing, run the API and open `/docs`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and return a token (disabled in read-only demo mode). |
| `POST` | `/api/auth/login` | Authenticate and return a token. |
| `GET` | `/api/auth/me` | Return the authenticated user. |
| `GET`, `POST` | `/api/income` | List paginated income or add a record. Supports `month`, `page`, `page_size`. |
| `PUT`, `DELETE` | `/api/income/{income_id}` | Edit or delete an income record owned by the user. |
| `GET`, `POST` | `/api/expenses` | List paginated expenses or add a record. List supports `q`, `category`, `month`, `start`, `end`, `page`, `page_size`. |
| `PUT`, `DELETE` | `/api/expenses/{expense_id}` | Edit or delete an expense record owned by the user. |
| `GET` | `/api/budgets?month=YYYY-MM` | Return monthly budget amounts, spending, remaining amounts, and alerts. |
| `PUT` | `/api/budgets` | Create/update a category budget for a month (disabled in read-only demo mode). |
| `DELETE` | `/api/budgets/{budget_id}` | Delete a budget owned by the user (disabled in read-only demo mode). |
| `GET` | `/api/dashboard?month=YYYY-MM` | Monthly totals, all-time balance, and recent transactions. |
| `GET` | `/api/analytics?month=YYYY-MM` | Category breakdowns and six-month trends. |
| `GET` | `/api/insights?month=YYYY-MM` | Rule-based monthly spending insights and suggestions. |
| `GET` | `/api/reports/summary?month=YYYY-MM` | Monthly summary, categories, and budgets. |
| `GET` | `/api/reports/expenses.csv` | Download filtered expenses. |
| `GET` | `/api/reports/monthly.csv?month=YYYY-MM` | Download a monthly report. |
| `GET` | `/api/categories` | Return the supported expense categories. |
| `GET` | `/api/health` | Health-check endpoint. |

Paginated income and expense responses have this shape:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 50
}
```

The maximum page size is 100.

## Data model

- **User:** name, unique email, bcrypt password hash, creation timestamp.
- **Income:** user, source, amount, date, optional note.
- **Expense:** user, title, amount, category, date, optional note.
- **Budget:** user, category, month (`YYYY-MM`), amount. A user can have one budget per category per month.

Amounts are stored using `NUMERIC(12, 2)`. Income, expenses, and budgets are linked to an account; reads and changes are scoped to the authenticated user.

## Deploy the sample demo to Render

The repository includes `render.yaml`, which defines:

- A Render Python web service for the API.
- A Render static site for the React frontend.
- A managed Render PostgreSQL database.
- A generated JWT secret.
- A read-only setting on the API and a sample-data notice in the frontend.

The shared demo account is shown on the public login screen, and the API rejects account registration and all transaction/budget changes when `READ_ONLY_DEMO=true`.

To deploy:

1. Push this repository to GitHub.
2. Sign in to Render and create a new Blueprint connected to the repository.
3. Select the Blueprint file `render.yaml` and review the API, static site, and database services before confirming.
4. After deployment, open the static-site URL and confirm that the login page and sample data work.
5. If Render assigns a URL that differs from the hostname in the Blueprint, update the API's `CORS_ORIGINS` to the exact frontend origin and set the static site's `VITE_API_URL` to the API URL ending in `/api`; then redeploy.

The Blueprint is **free and demo-only**. Render free web services can sleep while idle, and the free PostgreSQL database expires after 30 days, has a storage limit, and does not include backups. Never use it for real accounts or financial data. Check Render's current [free instance limitations](https://render.com/docs/free) before deploying; plan features and costs may change.

## Configuration reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | Production | Use `production` to enforce deployment checks. |
| `SECRET_KEY` | Production | Private, randomly generated JWT signing secret of at least 32 characters. Never commit it. |
| `DATABASE_URL` | Production | PostgreSQL connection string. SQLite is for local development only when `APP_ENV=production`. |
| `CORS_ORIGINS` | Production | Comma-separated, explicit HTTPS frontend origins without paths. Do not use `*`. |
| `READ_ONLY_DEMO` | No | Set to `true` to block registration and every transaction/budget write endpoint. |
| `VITE_API_URL` | Frontend | API base URL ending in `/api`; baked into the frontend when it is built. |
| `VITE_DEMO_MODE` | Frontend | Set to `true` to display the shared demo-login notice and hide UI write actions. Backend read-only mode must also be enabled. |

For local development, the backend defaults to SQLite and allows the Vite development origins. To generate a production secret locally, run `python -c "import secrets; print(secrets.token_urlsafe(32))"` and enter the result directly into your hosting provider's secret/environment settings. Do not paste production secrets into source files, commit them, or share them in support requests.

## Current limitations and before-production checklist

This project is a learning/portfolio app and sample demo, not a production financial service. Before accepting public accounts or real financial data:

- Replace browser `localStorage` token handling with a reviewed secure authentication design; add appropriate CSRF protection if using cookies.
- Add rate limiting for registration and login, email verification, password recovery, and account/data deletion.
- Choose a paid managed PostgreSQL plan with automated backups. Verify that a backup can be restored before relying on it.
- Review the application with a security assessment; add structured monitoring, error reporting, and operational alerts.
- Publish clear privacy, data-retention, and account-deletion policies. Do not imply the app provides professional financial advice.
- Test deployment and migrations against a production-like PostgreSQL instance before a public release.
- Consider performance/load testing and optimize the frontend bundle before scaling traffic.

## Troubleshooting

- **`ModuleNotFoundError` in the backend:** activate `backend/.venv` and run `python -m pip install -r requirements-dev.txt`.
- **Tables are missing:** from `backend/`, run `alembic upgrade head`.
- **Frontend says it cannot reach the server:** make sure the backend is running at port 8000 and that `VITE_API_URL` points to the correct API base URL.
- **Browser CORS error:** configure `CORS_ORIGINS` with the exact frontend origin (scheme and hostname, no path), then restart/redeploy the API.
- **Login is rejected after changing the JWT secret:** log in again; tokens signed using the old secret are invalid.
- **Render build works but API fails to start:** inspect service logs, verify the Blueprint environment variables, and confirm that the database is reachable and migrations run successfully.
