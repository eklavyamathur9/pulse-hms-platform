"""add_document_table

Revision ID: b6f4c3d2e1f0
Revises: a5f3b1c2d4e6
Create Date: 2026-06-16 10:12:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "b6f4c3d2e1f0"
down_revision = "a5f3b1c2d4e6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "document",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospital.id"), nullable=False),
        sa.Column("lab_test_id", sa.Integer(), sa.ForeignKey("lab_test.id"), nullable=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("filename", sa.String(256), nullable=False),
        sa.Column("original_name", sa.String(256), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_document_hospital", "document", ["hospital_id"])
    op.create_index("ix_document_lab_test", "document", ["hospital_id", "lab_test_id"])
    op.create_index("ix_document_patient", "document", ["hospital_id", "patient_id"])


def downgrade():
    op.drop_index("ix_document_patient", table_name="document")
    op.drop_index("ix_document_lab_test", table_name="document")
    op.drop_index("ix_document_hospital", table_name="document")
    op.drop_table("document")
