import datetime as dt
from decimal import Decimal
from typing import Literal, Optional, get_args

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Category = Literal[
    "Food", "Travel", "Rent", "Shopping", "Recharge",
    "Healthcare", "Education", "Entertainment", "Others",
]
CATEGORIES = list(get_args(Category))


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def enforce_bcrypt_byte_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes.")
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=64)

    @field_validator("password")
    @classmethod
    def enforce_bcrypt_byte_limit(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 UTF-8 bytes.")
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class IncomeIn(BaseModel):
    source: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0, le=Decimal("1000000000"), max_digits=12, decimal_places=2)
    date: dt.date
    note: Optional[str] = Field(default=None, max_length=200)


class IncomeOut(IncomeIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: float


class IncomePage(BaseModel):
    items: list[IncomeOut]
    total: int
    page: int
    page_size: int


class ExpenseIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    amount: Decimal = Field(gt=0, le=Decimal("1000000000"), max_digits=12, decimal_places=2)
    category: Category
    date: dt.date
    note: Optional[str] = Field(default=None, max_length=200)


class ExpenseOut(ExpenseIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: float


class ExpensePage(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int


class BudgetIn(BaseModel):
    category: Category
    amount: Decimal = Field(gt=0, le=Decimal("1000000000"), max_digits=12, decimal_places=2)
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class YearlyBudgetIn(BaseModel):
    category: Category
    amount: Decimal = Field(gt=0, le=Decimal("1000000000"), max_digits=12, decimal_places=2)
    year: int = Field(ge=2000, le=2100)
