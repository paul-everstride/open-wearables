"""add_coach_email_to_team

Revision ID: d6e7f8a9b0c1
Revises: c9e1f2a3b4d5
Branch Labels: None
Depends On: None

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, None] = "c9e1f2a3b4d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("team", sa.Column("coach_email", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("team", "coach_email")
