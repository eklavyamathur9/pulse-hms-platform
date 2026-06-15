"""add_refresh_token_and_password_policy

Revision ID: 58ad529942f8
Revises: e7f242c6b558
Create Date: 2026-06-15 12:30:28.092286

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "58ad529942f8"
down_revision = "e7f242c6b558"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("password_changed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "refresh_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("token_hash", sa.String(200), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_refresh_token_user", "refresh_token", ["user_id"])
    op.create_index("ix_refresh_token_expires", "refresh_token", ["expires_at"])


def downgrade():
    op.drop_index("ix_refresh_token_expires", table_name="refresh_token")
    op.drop_index("ix_refresh_token_user", table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_column("user", "password_changed_at")
