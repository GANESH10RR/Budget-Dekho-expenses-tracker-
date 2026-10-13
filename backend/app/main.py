from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analytics, auth, budgets, expenses, income, reports
from .schemas import CATEGORIES
from .settings import CORS_ORIGINS

app = FastAPI(title="BudgetDekho API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, income, expenses, budgets, analytics, reports):
    app.include_router(r.router)


@app.get("/api/categories", tags=["Meta"])
def categories():
    return CATEGORIES


@app.get("/api/health", tags=["Meta"])
def health():
    return {"status": "ok"}
