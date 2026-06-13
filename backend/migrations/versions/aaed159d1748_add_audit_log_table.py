"""add audit_log table

Revision ID: aaed159d1748
Revises: 58e5f1bc23af
Create Date: 2026-06-13 16:23:37.394486

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "aaed159d1748"
down_revision = "58e5f1bc23af"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=50), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("request_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["hospital_id"],
            ["hospital.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("audit_log", schema=None) as batch_op:
        batch_op.create_index("ix_audit_log_created", ["created_at"], unique=False)
        batch_op.create_index("ix_audit_log_hospital", ["hospital_id"], unique=False)
        batch_op.create_index("ix_audit_log_resource", ["resource_type", "resource_id"], unique=False)
        batch_op.create_index("ix_audit_log_user", ["user_id"], unique=False)


def downgrade():
    with op.batch_alter_table("audit_log", schema=None) as batch_op:
        batch_op.drop_index("ix_audit_log_user")
        batch_op.drop_index("ix_audit_log_resource")
        batch_op.drop_index("ix_audit_log_hospital")
        batch_op.drop_index("ix_audit_log_created")

    op.drop_table("audit_log")
