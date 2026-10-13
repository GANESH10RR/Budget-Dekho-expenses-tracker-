# BudgetDekho

A personal finance manager for students and working professionals. Track income and expenses, set monthly category budgets, see where your money goes, and get plain-language insights.

**Stack:** React 18 + Vite, React Router, Axios, Tailwind CSS, Recharts · FastAPI, SQLAlchemy, SQLite, JWT (PyJWT) + bcrypt.

## Project structure

```
BudgetDekho/
├── backend/
│   ├── requirements.txt
│   ├── seed.py                  # optional demo data
│   └── app/
│       ├── main.py              # FastAPI app, CORS, router wiring
│       ├── database.py          # SQLite engine + session
│       ├── models.py            # Users, Income, Expenses, Budgets
│       ├── schemas.py           # Pydantic models + category list
│       ├── auth.py              # password hashing, JWT, current-user dependency
│       ├── services.py          # query helpers + Python insights engine
│       └── routers/             # auth, income, expenses, budgets, analytics, reports
└── frontend/
    ├── package.json, vite.config.js, tailwind.config.js
    └── src/
        ├── App.jsx, main.jsx, api.js, index.css
        ├── context/AuthContext.jsx
        ├── components/          # Layout, ui (modal, badges, progress…)
        └── pages/               # Auth, Dashboard, Income, Expenses, Budgets, Analytics, Reports
```

## Setup

Requires **Python 3.10+** and **Node.js 18+**.

## Free public demo

`render.yaml` describes a read-only Render demo using seeded sample data and a managed Render Postgres database. The public demo credentials are intentionally visible in the login screen. All data-changing API routes, including account registration, are rejected in demo mode.

To publish it, push this folder to a GitHub repository, connect that repository to Render, and create a Blueprint from `render.yaml`. Check the generated frontend and API URLs after creation; if Render assigns different URLs, update `CORS_ORIGINS` on the API and `VITE_API_URL` on the static site. Do not use this free setup for real accounts or financial records: free web services sleep when idle, and free Render Postgres databases are limited and expire after 30 days without backups. A public production service needs paid compute, a paid managed PostgreSQL plan with backups, and the additional security and privacy work listed below.

### 1. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head
python seed.py                   # optional: demo user demo@budgetdekho.in / demo1234
uvicorn app.main:app --reload    # http://localhost:8000  (API docs at /docs)
```
Alembic manages the database schema. Run `alembic upgrade head` before starting the API with a new database. For a database created before migrations were added, back it up first and run `alembic stamp 0001_initial` once to record its existing schema; do not run the initial migration against tables that already exist. Run backend tests with `python -m pytest` from the backend directory.

Local development uses SQLite by default. Production requires a PostgreSQL `DATABASE_URL`, `APP_ENV=production`, a randomly generated `SECRET_KEY` of at least 32 characters, and the comma-separated `CORS_ORIGINS` for your frontend. The API normalizes PostgreSQL URLs for Psycopg and checks database connections before using pooled connections.

For Windows PowerShell, generate a secret with `python -c "import secrets; print(secrets.token_urlsafe(32))"`, then set the deployment environment variables (replace the example values):
```powershell
$env:APP_ENV = "production"
$env:SECRET_KEY = "<paste-the-generated-secret-here>"
$env:DATABASE_URL = "postgresql://<user>:<password>@<host>:5432/<database>"
$env:CORS_ORIGINS = "https://your-frontend-domain.example"
```
Do not commit secrets to source control. Configure these variables in your hosting provider's environment settings in production. The PostgreSQL driver is included in the backend requirements. These PowerShell values only last for the current terminal session.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```
To point at a different API, copy `.env.example` to `.env` and edit `VITE_API_URL`.

## Database schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY, name VARCHAR(60) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE, hashed_password VARCHAR(128) NOT NULL,
  created_at DATETIME NOT NULL
);
CREATE TABLE income (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  source VARCHAR(80) NOT NULL, amount NUMERIC(12, 2) NOT NULL, date DATE NOT NULL, note VARCHAR(200)
);
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(80) NOT NULL, amount NUMERIC(12, 2) NOT NULL, category VARCHAR(30) NOT NULL,
  date DATE NOT NULL, note VARCHAR(200)
);
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  category VARCHAR(30) NOT NULL, amount NUMERIC(12, 2) NOT NULL, month VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
  UNIQUE (user_id, category, month)
);
```
Every query is scoped to the logged-in user, so users can only see and change their own data.

## API overview

All routes except register/login need the header `Authorization: Bearer <token>`. `month` is `YYYY-MM`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account / log in (returns JWT) |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/income` · PUT/DELETE `/api/income/{id}` | Paginated income CRUD (`?month=&page=&page_size=`) |
| GET/POST | `/api/expenses` · PUT/DELETE `/api/expenses/{id}` | Paginated expense CRUD (`?q=&category=&month=&start=&end=&page=&page_size=`) |
| GET / PUT | `/api/budgets?month=` · DELETE `/api/budgets/{id}` | Budgets with spent / remaining / alert status (upsert on PUT) |
| GET | `/api/dashboard?month=` | Totals, balance, savings %, recent transactions |
| GET | `/api/analytics?month=` | Category breakdown, top categories, 6-month trends |
| GET | `/api/insights?month=` | Generated insights and suggestions |
| GET | `/api/reports/summary?month=` | Monthly summary |
| GET | `/api/reports/expenses.csv`, `/api/reports/monthly.csv` | CSV downloads |

## How the pieces work

- **Auth:** passwords are hashed with bcrypt. New passwords must be at least 8 characters and fit bcrypt's byte limit. Login returns a JWT (24 h) stored in `localStorage`; Axios attaches it to every request, and a 401 sends the user back to login. React Router's `Protected` wrapper guards the app pages.
- **Budget alerts:** status is `warning` at ≥ 80% of the budget and `exceeded` at ≥ 100%. Alerts show on the Dashboard and Budgets pages.
- **Insights** (`backend/app/services.py`): highest category and its share of spending, savings rate, month-over-month change in total and per-category spending (changes of 10% or more), and suggestions when a category's share is high (for example Food above 30%), when a budget is exceeded, or when savings are under 20%.

## Notes and next steps

- Development CORS allows `localhost:5173`; production requires explicit HTTPS frontend origins in `CORS_ORIGINS`.
- Automated tests and GitHub Actions CI cover core API access, data isolation, pagination, CSV exports, settings, and migrations.
- This project is not yet ready for handling real financial data from the public. Before public launch, add and review a safer browser token-storage strategy, login/register rate limits, account recovery and deletion, privacy/retention terms, monitoring, and verified production backups. Deploy first with sample data and complete a security review.
- Further product work could include recurring transactions, email verification, and additional account-management features.
