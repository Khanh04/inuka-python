"""User schemas for request/response."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserBase(BaseModel):
    """Base schema for user with common fields."""

    username: str
    email: str


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    """Response schema for user."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
