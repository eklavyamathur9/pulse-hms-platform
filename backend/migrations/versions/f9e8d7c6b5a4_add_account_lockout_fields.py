"""add_account_lockout_fields

Revision ID: f9e8d7c6b5a4
Revises: e3f4a5b6c7d8
Create Date: 2026-06-20 14:55:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "f9e8d7c6b5a4"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("failed_login_attempts", sa.Integer(), server_default="0"))
    op.add_column("user", sa.Column("locked_until", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("user", "locked_until")
    op.drop_column("user", "failed_login_attempts")
