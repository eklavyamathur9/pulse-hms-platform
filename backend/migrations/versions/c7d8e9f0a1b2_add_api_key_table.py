"""add api_key table

Revision ID: c7d8e9f0a1b2
Revises: b6f4c3d2e1f0
Create Date: 2026-06-19 06:30:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c7d8e9f0a1b2"
down_revision = "b6f4c3d2e1f0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "api_key",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("key_hash", sa.String(length=200), nullable=False),
        sa.Column("key_prefix", sa.String(length=20), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["hospital_id"], ["hospital.id"],),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"],),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_hash"),
    )
    op.create_index("ix_api_key_hospital", "api_key", ["hospital_id"])
    op.create_index("ix_api_key_key_hash", "api_key", ["key_hash"])


def downgrade():
    op.drop_index("ix_api_key_key_hash", table_name="api_key")
    op.drop_index("ix_api_key_hospital", table_name="api_key")
    op.drop_table("api_key")
