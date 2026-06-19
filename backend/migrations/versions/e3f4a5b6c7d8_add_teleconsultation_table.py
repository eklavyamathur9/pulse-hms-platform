"""add teleconsultation table

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-06-19 06:35:00.000000

"""

from alembic import op
import sqlalchemy as sa

revision = "e3f4a5b6c7d8"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "teleconsultation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("hospital_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("room_name", sa.String(length=100), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("meeting_url", sa.String(length=500), nullable=True),
        sa.Column("recording_url", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["hospital_id"], ["hospital.id"],),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointment.id"],),
        sa.ForeignKeyConstraint(["doctor_id"], ["user.id"],),
        sa.ForeignKeyConstraint(["patient_id"], ["user.id"],),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_name"),
    )
    op.create_index("ix_teleconsultation_appointment", "teleconsultation", ["appointment_id"])
    op.create_index("ix_teleconsultation_hospital_status", "teleconsultation", ["hospital_id", "status"])


def downgrade():
    op.drop_index("ix_teleconsultation_hospital_status", table_name="teleconsultation")
    op.drop_index("ix_teleconsultation_appointment", table_name="teleconsultation")
    op.drop_table("teleconsultation")
