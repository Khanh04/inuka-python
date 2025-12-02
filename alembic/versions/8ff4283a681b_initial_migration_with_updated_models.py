"""initial migration with updated models

Revision ID: 8ff4283a681b
Revises:
Create Date: 2025-11-28 14:32:51.784393

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8ff4283a681b"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema with all tables."""
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    # Create templates table
    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tesseract_params", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_templates_id"), "templates", ["id"], unique=False)
    op.create_index(op.f("ix_templates_name"), "templates", ["name"], unique=False)

    # Create files table
    op.create_table(
        "files",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_files_id"), "files", ["id"], unique=False)
    op.create_index(op.f("ix_files_name"), "files", ["name"], unique=False)

    # Create forms table (without name and form_type - will be added in next migration)
    op.create_table(
        "forms",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("template", sa.JSON(), nullable=True),
        sa.Column("all_page_params", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["templates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_forms_id"), "forms", ["id"], unique=False)
    op.create_index(op.f("ix_forms_template_id"), "forms", ["template_id"], unique=False)

    # Create documents table
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("file_id", sa.Integer(), nullable=False),
        sa.Column("form_id", sa.Integer(), nullable=False),
        sa.Column("document_number", sa.String(length=255), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_document_number"), "documents", ["document_number"], unique=False)
    op.create_index(op.f("ix_documents_file_id"), "documents", ["file_id"], unique=False)
    op.create_index(op.f("ix_documents_form_id"), "documents", ["form_id"], unique=False)
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)

    # Create ocr_jobs table
    op.create_table(
        "ocr_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("image_data", sa.Text(), nullable=True),
        sa.Column("tesseract_params", sa.JSON(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ocr_jobs_id"), "ocr_jobs", ["id"], unique=False)
    op.create_index(op.f("ix_ocr_jobs_status"), "ocr_jobs", ["status"], unique=False)


def downgrade() -> None:
    """Drop all tables."""
    op.drop_index(op.f("ix_ocr_jobs_status"), table_name="ocr_jobs")
    op.drop_index(op.f("ix_ocr_jobs_id"), table_name="ocr_jobs")
    op.drop_table("ocr_jobs")

    op.drop_index(op.f("ix_documents_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_form_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_file_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_document_number"), table_name="documents")
    op.drop_table("documents")

    op.drop_index(op.f("ix_forms_template_id"), table_name="forms")
    op.drop_index(op.f("ix_forms_id"), table_name="forms")
    op.drop_table("forms")

    op.drop_index(op.f("ix_files_name"), table_name="files")
    op.drop_index(op.f("ix_files_id"), table_name="files")
    op.drop_table("files")

    op.drop_index(op.f("ix_templates_name"), table_name="templates")
    op.drop_index(op.f("ix_templates_id"), table_name="templates")
    op.drop_table("templates")

    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
