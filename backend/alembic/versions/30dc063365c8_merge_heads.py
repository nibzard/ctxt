"""Merge heads

Revision ID: 30dc063365c8
Revises: add_token_count_001, e591c83b60dd
Create Date: 2025-09-04 21:54:08.133301

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30dc063365c8'
down_revision: Union[str, None] = ('add_token_count_001', 'e591c83b60dd')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
