from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Expense, User
from ..schemas import ExpenseIn, ExpenseOut, ExpensePage
from ..services import get_owned, month_bounds, require_writable, valid_month

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


def filtered_expenses(db, user, q=None, category=None, month=None, start=None, end=None):
    query = db.query(Expense).filter(Expense.user_id == user.id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Expense.title.ilike(like), Expense.note.ilike(like)))
    if category:
        query = query.filter(Expense.category == category)
    if month:
        start, end = month_bounds(month)
    if start:
        query = query.filter(Expense.date >= start)
    if end:
        query = query.filter(Expense.date <= end)
    return query.order_by(Expense.date.desc(), Expense.id.desc())


@router.get("", response_model=ExpensePage)
def list_expenses(
    q: str | None = Query(None, max_length=80),
    category: str | None = None,
    start: date | None = None,
    end: date | None = None,
    month: str | None = Depends(valid_month),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = filtered_expenses(db, user, q, category, month, start, end)
    total = query.order_by(None).count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=ExpenseOut, status_code=201, dependencies=[Depends(require_writable)])
def add_expense(data: ExpenseIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = Expense(**data.model_dump(), user_id=user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{expense_id}", response_model=ExpenseOut, dependencies=[Depends(require_writable)])
def edit_expense(expense_id: int, data: ExpenseIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = get_owned(db, Expense, expense_id, user)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{expense_id}", status_code=204, dependencies=[Depends(require_writable)])
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(get_owned(db, Expense, expense_id, user))
    db.commit()
