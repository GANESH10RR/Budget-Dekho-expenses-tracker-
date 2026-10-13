from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Income, User
from ..schemas import IncomeIn, IncomeOut, IncomePage
from ..services import get_owned, month_bounds, require_writable, valid_month

router = APIRouter(prefix="/api/income", tags=["Income"])


@router.get("", response_model=IncomePage)
def list_income(
    month: str | None = Depends(valid_month),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Income).filter(Income.user_id == user.id)
    if month:
        start, end = month_bounds(month)
        q = q.filter(Income.date >= start, Income.date <= end)
    total = q.count()
    items = q.order_by(Income.date.desc(), Income.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=IncomeOut, status_code=201, dependencies=[Depends(require_writable)])
def add_income(data: IncomeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = Income(**data.model_dump(), user_id=user.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{income_id}", response_model=IncomeOut, dependencies=[Depends(require_writable)])
def edit_income(income_id: int, data: IncomeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = get_owned(db, Income, income_id, user)
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{income_id}", status_code=204, dependencies=[Depends(require_writable)])
def delete_income(income_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(get_owned(db, Income, income_id, user))
    db.commit()
