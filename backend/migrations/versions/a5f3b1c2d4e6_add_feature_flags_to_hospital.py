"""add_feature_flags_to_hospital

Revision ID: a5f3b1c2d4e6
Revises: 58ad529942f8
Create Date: 2026-06-15 12:45:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "a5f3b1c2d4e6"
down_revision = "58ad529942f8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("hospital", sa.Column("feature_flags", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("hospital", "feature_flags")
