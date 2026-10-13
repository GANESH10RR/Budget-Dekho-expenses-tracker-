from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, Income, User
from ..services import (
    build_insights, by_category, current_month, month_bounds, month_label,
    month_summary, shift_month, total, valid_month,
)

router = APIRouter(prefix="/api", tags=["Dashboard & Analytics"])


@router.get("/dashboard")
def dashboard(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = month_summary(db, user.id, month)
    data["balance"] = round(total(db, Income, user.id) - total(db, Expense, user.id), 2)  # all-time
    recent = []
    for i in db.query(Income).filter(Income.user_id == user.id).order_by(Income.date.desc(), Income.id.desc()).limit(6):
        recent.append({"key": f"i{i.id}", "type": "income", "title": i.source, "category": "Income", "amount": i.amount, "date": i.date.isoformat(), "id": i.id})
    for e in db.query(Expense).filter(Expense.user_id == user.id).order_by(Expense.date.desc(), Expense.id.desc()).limit(6):
        recent.append({"key": f"e{e.id}", "type": "expense", "title": e.title, "category": e.category, "amount": e.amount, "date": e.date.isoformat(), "id": e.id})
    data["recent"] = sorted(recent, key=lambda r: (r["date"], r["id"]), reverse=True)[:6]
    return data


@router.get("/analytics")
def analytics(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    month = current_month(month)
    start, end = month_bounds(month)
    cats = by_category(db, user.id, start, end)
    spent = sum(cats.values())
    breakdown = [{"category": c, "amount": a, "percent": round(a / spent * 100, 1)} for c, a in cats.items()]

    trend = []
    for m in (shift_month(month, -i) for i in range(5, -1, -1)):
        s, e = month_bounds(m)
        inc, exp = total(db, Income, user.id, s, e), total(db, Expense, user.id, s, e)
        trend.append({"month": m, "label": month_label(m), "income": inc, "expense": exp, "savings": round(inc - exp, 2)})

    return {"month": month, "breakdown": breakdown, "top_categories": breakdown[:3], "trend": trend}


@router.get("/insights")
def insights(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_insights(db, user.id, month)
