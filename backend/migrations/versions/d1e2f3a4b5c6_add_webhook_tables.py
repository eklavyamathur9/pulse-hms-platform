"""add webhook tables

Revision ID: d1e2f3a4b5c6
Revises: c7d8e9f0a1b2
Create Date: 2026-06-19 06:32:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "d1e2f3a4b5c6"
down_revision = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "webhook",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("secret", sa.String(length=200), nullable=False),
        sa.Column("events", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=True),
        sa.Column("timeout_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["hospital_id"], ["hospital.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_hospital", "webhook", ["hospital_id"])

    op.create_table(
        "webhook_delivery",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("webhook_id", sa.Integer(), nullable=False),
        sa.Column("event", sa.String(length=50), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("response_code", sa.Integer(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=True),
        sa.Column("next_retry_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["webhook_id"], ["webhook.id"],),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_delivery_webhook", "webhook_delivery", ["webhook_id"])
    op.create_index("ix_webhook_delivery_status", "webhook_delivery", ["status"])


def downgrade():
    op.drop_index("ix_webhook_delivery_status", table_name="webhook_delivery")
    op.drop_index("ix_webhook_delivery_webhook", table_name="webhook_delivery")
    op.drop_table("webhook_delivery")
    op.drop_index("ix_webhook_hospital", table_name="webhook")
    op.drop_table("webhook")
