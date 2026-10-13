import csv
import io
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, Income, User
from ..services import (
    budget_status, by_category, current_month, month_bounds, month_summary, valid_month,
)
from .expenses import filtered_expenses

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def spreadsheet_safe_text(value: str | None) -> str:
    if value is None:
        return ""
    if value.startswith(("\t", "\r", "\n")) or value.lstrip(" \t\r\n").startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def csv_response(rows: list, filename: str) -> Response:
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    return Response(
        content="\ufeff" + buf.getvalue(),  # BOM so Excel shows ₹ correctly
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary")
def summary(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    month = current_month(month)
    start, end = month_bounds(month)
    data = month_summary(db, user.id, month)
    spent = data["total_expense"]
    data["categories"] = [
        {"category": c, "amount": a, "percent": round(a / spent * 100, 1)}
        for c, a in by_category(db, user.id, start, end).items()
    ]
    data["budgets"] = budget_status(db, user.id, month)
    return data


@router.get("/expenses.csv")
def expenses_csv(
    category: str | None = None,
    q: str | None = None,
    month: str | None = Depends(valid_month),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = [["Date", "Title", "Category", "Amount (INR)", "Note"]]
    for e in filtered_expenses(db, user, q, category, month):
        rows.append([
            e.date.isoformat(), spreadsheet_safe_text(e.title), e.category,
            f"{e.amount:.2f}", spreadsheet_safe_text(e.note),
        ])
    return csv_response(rows, f"budgetdekho-expenses-{month or 'all'}.csv")


@router.get("/monthly.csv")
def monthly_report(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    month = current_month(month)
    start, end = month_bounds(month)
    s = month_summary(db, user.id, month)
    rows = [
        ["BudgetDekho Monthly Report"], ["Name", spreadsheet_safe_text(user.name)], ["Month", month], ["Generated", date.today().isoformat()], [],
        ["SUMMARY"],
        ["Total income", f"{s['total_income']:.2f}"],
        ["Total expenses", f"{s['total_expense']:.2f}"],
        ["Savings", f"{s['savings']:.2f}"],
        ["Savings rate (%)", s["savings_percentage"]], [],
        ["CATEGORY SPENDING"], ["Category", "Amount", "Share (%)"],
    ]
    spent = s["total_expense"]
    for c, a in by_category(db, user.id, start, end).items():
        rows.append([c, f"{a:.2f}", round(a / spent * 100, 1)])
    rows += [[], ["BUDGETS"], ["Category", "Budget", "Spent", "Remaining", "Used (%)", "Status"]]
    for b in budget_status(db, user.id, month):
        rows.append([b["category"], f"{b['amount']:.2f}", f"{b['spent']:.2f}", f"{b['remaining']:.2f}", b["percent"], b["status"]])
    rows += [[], ["INCOME"], ["Date", "Source", "Amount"]]
    for i in db.query(Income).filter(Income.user_id == user.id, Income.date >= start, Income.date <= end).order_by(Income.date):
        rows.append([i.date.isoformat(), spreadsheet_safe_text(i.source), f"{i.amount:.2f}"])
    rows += [[], ["EXPENSES"], ["Date", "Title", "Category", "Amount"]]
    for e in db.query(Expense).filter(Expense.user_id == user.id, Expense.date >= start, Expense.date <= end).order_by(Expense.date):
        rows.append([e.date.isoformat(), spreadsheet_safe_text(e.title), e.category, f"{e.amount:.2f}"])
    return csv_response(rows, f"budgetdekho-report-{month}.csv")
