"""Optional: load a demo account with 3 months of data.
Run from the backend folder:  python seed.py
Login: demo@budgetdekho.in / demo1234
"""
import random
from datetime import date

from app.auth import hash_password
from app.database import SessionLocal
from app.models import Budget, Expense, Income, User
from app.services import month_bounds, shift_month, current_month

db = SessionLocal()
if db.query(User).filter_by(email="demo@budgetdekho.in").first():
    print("Demo user already exists; sample data was left unchanged.")
    raise SystemExit(0)

random.seed(7)
user = User(name="Demo User", email="demo@budgetdekho.in", hashed_password=hash_password("demo1234"))
db.add(user)
db.commit()

PLAN = {  # category: (title, count, min, max)
    "Food": ("Groceries & eating out", 12, 150, 900), "Travel": ("Metro / cab", 8, 60, 700),
    "Rent": ("Monthly rent", 1, 12000, 12000), "Shopping": ("Online order", 3, 400, 3000),
    "Recharge": ("Mobile recharge", 1, 299, 299), "Healthcare": ("Pharmacy", 1, 200, 900),
    "Education": ("Online course", 1, 499, 1999), "Entertainment": ("Movies / OTT", 3, 150, 700),
    "Others": ("Miscellaneous", 2, 100, 600),
}
this = current_month()
for back in (2, 1, 0):
    m = shift_month(this, -back)
    start, end = month_bounds(m)
    last = min(end, date.today()).day if back == 0 else end.day
    db.add(Income(user_id=user.id, source="Salary", amount=55000, date=start, note=None))
    if random.random() > 0.4:
        db.add(Income(user_id=user.id, source="Freelance", amount=random.randint(3000, 9000), date=date(start.year, start.month, min(15, last))))
    for cat, (title, n, lo, hi) in PLAN.items():
        for _ in range(n):
            db.add(Expense(user_id=user.id, title=title, category=cat, amount=random.randint(lo, hi),
                           date=date(start.year, start.month, random.randint(1, last))))
    for cat, amt in {"Food": 8000, "Travel": 3000, "Shopping": 4000, "Entertainment": 1500}.items():
        db.add(Budget(user_id=user.id, category=cat, amount=amt, month=m))
db.commit()
print("Demo data loaded. Login: demo@budgetdekho.in / demo1234")
