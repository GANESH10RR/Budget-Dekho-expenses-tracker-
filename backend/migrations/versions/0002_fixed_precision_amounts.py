"""Store transaction and budget amounts with two-decimal precision.

Revision ID: 0002_fixed_precision
Revises: 0001_initial
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_fixed_precision"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("income", "expenses", "budgets"):
        op.execute(sa.text(f"UPDATE {table} SET amount = ROUND(CAST(amount AS NUMERIC), 2)"))
        with op.batch_alter_table(table) as batch_op:
            batch_op.alter_column(
                "amount",
                existing_type=sa.Float(),
                type_=sa.Numeric(12, 2),
                existing_nullable=False,
            )


def downgrade() -> None:
    for table in ("income", "expenses", "budgets"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.alter_column(
                "amount",
                existing_type=sa.Numeric(12, 2),
                type_=sa.Float(),
                existing_nullable=False,
            )
