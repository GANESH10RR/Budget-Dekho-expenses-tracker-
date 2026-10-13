from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Budget, User
from ..schemas import BudgetIn
from ..services import budget_status, current_month, get_owned, require_writable, valid_month

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


@router.get("")
def list_budgets(month: str | None = Depends(valid_month), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    month = current_month(month)
    items = budget_status(db, user.id, month)
    return {
        "month": month,
        "budgets": items,
        "total_budget": round(sum(b["amount"] for b in items), 2),
        "total_spent": round(sum(b["spent"] for b in items), 2),
    }


@router.put("", dependencies=[Depends(require_writable)])
def set_budget(data: BudgetIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create the budget for (category, month), or update it if it already exists."""
    obj = db.query(Budget).filter(Budget.user_id == user.id, Budget.category == data.category, Budget.month == data.month).first()
    if obj:
        obj.amount = data.amount
    else:
        db.add(Budget(user_id=user.id, **data.model_dump()))
    db.commit()
    return {"ok": True}


@router.delete("/{budget_id}", status_code=204, dependencies=[Depends(require_writable)])
def delete_budget(budget_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(get_owned(db, Budget, budget_id, user))
    db.commit()
