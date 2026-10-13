"""Shared query helpers + the Python insights engine."""
import calendar
from datetime import date
from typing import Optional

from fastapi import HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Budget, Expense, Income
from .schemas import CATEGORIES
from .settings import READ_ONLY_DEMO


def require_writable() -> None:
    if READ_ONLY_DEMO:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This public demo is read-only; changes are not saved.")


# ---------- months ----------
def valid_month(month: Optional[str] = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")):
    return month


def parse_month(month: Optional[str] = None):
    if month:
        y, m = map(int, month.split("-"))
    else:
        t = date.today()
        y, m = t.year, t.month
    return y, m


def current_month(month: Optional[str] = None) -> str:
    y, m = parse_month(month)
    return f"{y:04d}-{m:02d}"


def month_bounds(month: Optional[str] = None):
    y, m = parse_month(month)
    return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])


def shift_month(month: str, delta: int) -> str:
    y, m = parse_month(month)
    idx = y * 12 + (m - 1) + delta
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def month_label(month: str) -> str:
    y, m = parse_month(month)
    return f"{calendar.month_abbr[m]} {str(y)[2:]}"


# ---------- queries ----------
def get_owned(db: Session, model, obj_id: int, user):
    obj = db.query(model).filter(model.id == obj_id, model.user_id == user.id).first()
    if not obj:
        raise HTTPException(404, "Record not found.")
    return obj


def total(db: Session, model, uid: int, start=None, end=None) -> float:
    q = db.query(func.coalesce(func.sum(model.amount), 0.0)).filter(model.user_id == uid)
    if start:
        q = q.filter(model.date >= start)
    if end:
        q = q.filter(model.date <= end)
    return round(float(q.scalar()), 2)


def by_category(db: Session, uid: int, start, end) -> dict:
    rows = (
        db.query(Expense.category, func.sum(Expense.amount))
        .filter(Expense.user_id == uid, Expense.date >= start, Expense.date <= end)
        .group_by(Expense.category)
        .all()
    )
    return dict(sorted(((c, round(float(a), 2)) for c, a in rows), key=lambda x: -x[1]))


def savings_rate(income: float, expense: float) -> float:
    return round((income - expense) / income * 100, 1) if income > 0 else 0.0


def month_summary(db: Session, uid: int, month: Optional[str]) -> dict:
    month = current_month(month)
    start, end = month_bounds(month)
    income = total(db, Income, uid, start, end)
    expense = total(db, Expense, uid, start, end)
    return {
        "month": month,
        "total_income": income,
        "total_expense": expense,
        "savings": round(income - expense, 2),
        "savings_percentage": savings_rate(income, expense),
    }


def budget_status(db: Session, uid: int, month: Optional[str]) -> list:
    month = current_month(month)
    start, end = month_bounds(month)
    spent = by_category(db, uid, start, end)
    rows = db.query(Budget).filter(Budget.user_id == uid, Budget.month == month).all()
    result = []
    for b in sorted(rows, key=lambda r: CATEGORIES.index(r.category)):
        used = spent.get(b.category, 0.0)
        amount = float(b.amount)
        pct = round(used / amount * 100, 1)
        state = "exceeded" if pct >= 100 else "warning" if pct >= 80 else "ok"
        message = None
        if state == "exceeded":
            message = f"{b.category}: you've crossed your budget by ₹{used - amount:,.0f}."
        elif state == "warning":
            message = f"{b.category}: you've used {pct:.0f}% of your budget."
        result.append({
            "id": b.id, "category": b.category, "month": b.month, "amount": amount,
            "spent": used, "remaining": round(amount - used, 2), "percent": pct,
            "status": state, "alert": message,
        })
    return result


# ---------- insights ----------
LIMITS = {"Food": 30, "Shopping": 15, "Entertainment": 10, "Travel": 15, "Recharge": 5}
TIPS = {
    "Food": "Plan meals for the week and cook at home more often to cut food costs.",
    "Shopping": "Try a 48-hour rule: wait two days before buying non-essentials.",
    "Entertainment": "Review your subscriptions and cancel the ones you rarely use.",
    "Travel": "Look at passes, carpooling or public transport to reduce travel spend.",
    "Recharge": "Compare plans; a longer-validity recharge is often cheaper per month.",
}


def build_insights(db: Session, uid: int, month: Optional[str]) -> dict:
    month = current_month(month)
    start, end = month_bounds(month)
    pstart, pend = month_bounds(shift_month(month, -1))

    income = total(db, Income, uid, start, end)
    expense = total(db, Expense, uid, start, end)
    cats = by_category(db, uid, start, end)
    prev_cats = by_category(db, uid, pstart, pend)
    prev_expense = total(db, Expense, uid, pstart, pend)

    if income == 0 and expense == 0:
        return {"month": month, "savings_rate": 0, "category_share": [], "suggestions": [],
                "insights": [{"type": "info", "message": "Add income and expenses to see insights for this month."}]}

    share = [{"category": c, "amount": a, "percent": round(a / expense * 100, 1)} for c, a in cats.items()] if expense else []
    insights, suggestions = [], []

    if share:
        top = share[0]
        insights.append({"type": "info", "message": f"Highest spending: {top['category']} (₹{top['amount']:,.0f}) — {top['percent']:.0f}% of total spending."})

    rate = savings_rate(income, expense)
    if income > 0:
        if rate >= 0:
            insights.append({"type": "good" if rate >= 20 else "info", "message": f"You saved {rate:.0f}% of your income this month."})
        else:
            insights.append({"type": "warn", "message": f"You spent {abs(rate):.0f}% more than you earned this month."})
    elif expense > 0:
        insights.append({"type": "warn", "message": "No income recorded this month, so savings can't be calculated."})

    if prev_expense > 0 and expense > 0:
        change = (expense - prev_expense) / prev_expense * 100
        word = "increased" if change > 0 else "decreased"
        insights.append({"type": "warn" if change > 0 else "good", "message": f"Total spending {word} by {abs(change):.0f}% compared to last month."})

    changes = []
    for c, a in cats.items():
        p = prev_cats.get(c, 0)
        if p > 0:
            changes.append((c, (a - p) / p * 100))
    for c, ch in sorted([x for x in changes if abs(x[1]) >= 10], key=lambda x: -abs(x[1]))[:3]:
        word = "increased" if ch > 0 else "decreased"
        insights.append({"type": "warn" if ch > 0 else "good", "message": f"{c} expenses {word} by {abs(ch):.0f}% compared to last month."})

    for row in share:
        limit = LIMITS.get(row["category"])
        if limit and row["percent"] > limit:
            suggestions.append(f"{row['category']} is {row['percent']:.0f}% of your spending. {TIPS[row['category']]}")
    for b in budget_status(db, uid, month):
        if b["status"] == "exceeded":
            suggestions.append(f"You're over your {b['category']} budget. Pause spending there or raise the limit if it's realistic.")
    if income > 0 and rate < 20:
        suggestions.append("Aim to save at least 20% of income. The 50/30/20 rule (needs/wants/savings) is a good start.")
    if not suggestions:
        suggestions.append("Your spending looks balanced. Keep it up!")

    return {"month": month, "savings_rate": rate, "category_share": share, "insights": insights, "suggestions": suggestions}
