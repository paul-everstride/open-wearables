"""drop_external_user_id_unique

Revision ID: a1b2c3d4e5f7
Revises: e1f2a3b4c5d6
Branch Labels: None
Depends On: None

"""

from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f7"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("user_external_user_id_key", "user", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("user_external_user_id_key", "user", ["external_user_id"])
