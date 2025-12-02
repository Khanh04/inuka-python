"""add_name_and_form_type_to_forms

Revision ID: fb7f8e463f99
Revises: 8ff4283a681b
Create Date: 2025-12-02 23:01:12.761801

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "fb7f8e463f99"
down_revision: Union[str, Sequence[str], None] = "8ff4283a681b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add name and form_type columns to forms table."""
    # Create enum type for form_type (PostgreSQL)
    form_type_enum = sa.Enum(
        "customs_export",
        "customs_import",
        "invoice",
        "packing_list",
        "other",
        name="form_type_enum",
    )

    # Check if we're using PostgreSQL or SQLite
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        # Create enum type first for PostgreSQL
        form_type_enum.create(bind, checkfirst=True)

    # Add name column (nullable initially for existing rows)
    op.add_column("forms", sa.Column("name", sa.String(length=255), nullable=True))

    # Add form_type column
    if dialect_name == "postgresql":
        op.add_column(
            "forms",
            sa.Column(
                "form_type",
                form_type_enum,
                nullable=True,
            ),
        )
    else:
        # SQLite doesn't support ENUM, use VARCHAR instead
        op.add_column(
            "forms",
            sa.Column(
                "form_type",
                sa.String(length=50),
                nullable=True,
            ),
        )

    # Update existing rows with default values
    op.execute("UPDATE forms SET name = 'Untitled Form' WHERE name IS NULL")
    op.execute("UPDATE forms SET form_type = 'other' WHERE form_type IS NULL")

    # Make columns non-nullable after setting defaults
    op.alter_column("forms", "name", nullable=False)
    op.alter_column("forms", "form_type", nullable=False)

    # Create index on name column
    op.create_index(op.f("ix_forms_name"), "forms", ["name"], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove name and form_type columns from forms table."""
    # Drop index
    op.drop_index(op.f("ix_forms_name"), table_name="forms")

    # Drop columns
    op.drop_column("forms", "form_type")
    op.drop_column("forms", "name")

    # Drop enum type for PostgreSQL
    bind = op.get_bind()
    dialect_name = bind.dialect.name

    if dialect_name == "postgresql":
        sa.Enum(name="form_type_enum").drop(bind, checkfirst=True)
