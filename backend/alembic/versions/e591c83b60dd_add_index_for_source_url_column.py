"""Add index for source_url column

Revision ID: e591c83b60dd
Revises: 6df02cd2e957
Create Date: 2025-09-02 20:35:11.539273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e591c83b60dd'
down_revision: Union[str, None] = '6df02cd2e957'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add index on source_url for faster cache lookups
    op.create_index('idx_conversions_source_url', 'conversions', ['source_url'])


def downgrade() -> None:
    # Remove index on source_url
    op.drop_index('idx_conversions_source_url', table_name='conversions')
