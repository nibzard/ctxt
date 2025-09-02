"""Replace Stripe with Polar fields

Revision ID: 6df02cd2e957
Revises: 
Create Date: 2025-09-02 12:11:57.117886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6df02cd2e957'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new Polar fields
    op.add_column('users', sa.Column('polar_customer_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('polar_subscription_id', sa.String(), nullable=True))
    
    # Migrate data from Stripe fields if they exist (optional)
    # Note: This assumes the stripe columns exist. If not, this will be handled gracefully.
    try:
        # Copy stripe_customer_id to polar_customer_id
        op.execute("UPDATE users SET polar_customer_id = stripe_customer_id WHERE stripe_customer_id IS NOT NULL")
        # Copy stripe_subscription_id to polar_subscription_id  
        op.execute("UPDATE users SET polar_subscription_id = stripe_subscription_id WHERE stripe_subscription_id IS NOT NULL")
        
        # Drop the old Stripe columns
        op.drop_column('users', 'stripe_customer_id')
        op.drop_column('users', 'stripe_subscription_id')
    except Exception:
        # If Stripe columns don't exist, just continue
        pass


def downgrade() -> None:
    # Add back Stripe fields
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('stripe_subscription_id', sa.String(), nullable=True))
    
    # Migrate data back from Polar fields if they exist
    try:
        # Copy polar_customer_id to stripe_customer_id
        op.execute("UPDATE users SET stripe_customer_id = polar_customer_id WHERE polar_customer_id IS NOT NULL")
        # Copy polar_subscription_id to stripe_subscription_id
        op.execute("UPDATE users SET stripe_subscription_id = polar_subscription_id WHERE polar_subscription_id IS NOT NULL")
        
        # Drop the Polar columns
        op.drop_column('users', 'polar_customer_id')
        op.drop_column('users', 'polar_subscription_id')
    except Exception:
        # If Polar columns don't exist, just continue
        pass
