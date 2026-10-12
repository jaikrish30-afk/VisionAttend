"""init schema

Revision ID: 16d4f62b49c5
Revises: 
Create Date: 2026-10-12 18:14:01.687455

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16d4f62b49c5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('verification_audit_logs') as batch_op:
        batch_op.alter_column('status',
                   existing_type=sa.VARCHAR(length=32),
                   type_=sa.String(length=64),
                   existing_nullable=False)
        batch_op.alter_column('notes',
                   existing_type=sa.VARCHAR(length=256),
                   type_=sa.Text(),
                   existing_nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('verification_audit_logs') as batch_op:
        batch_op.alter_column('notes',
                   existing_type=sa.Text(),
                   type_=sa.VARCHAR(length=256),
                   existing_nullable=True)
        batch_op.alter_column('status',
                   existing_type=sa.String(length=64),
                   type_=sa.VARCHAR(length=32),
                   existing_nullable=False)
