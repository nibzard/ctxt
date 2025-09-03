"""Add token_count column to conversions table

Revision ID: add_token_count_001
Revises: 6df02cd2e957
Create Date: 2025-09-03 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_token_count_001'
down_revision: Union[str, None] = '6df02cd2e957'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add token_count column to conversions table
    op.add_column('conversions', sa.Column('token_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove token_count column from conversions table
    op.drop_column('conversions', 'token_count')