"""
User schemas
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    is_active: bool = True


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1)
    last_name: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """User in database schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    is_staff: bool
    is_superuser: bool
    date_joined: datetime
    last_login: Optional[datetime] = None


class UserResponse(UserInDB):
    """User response schema"""
    pass


class UserListResponse(BaseModel):
    """User list response with pagination"""
    results: List[UserResponse]
    count: int
    page: int
    page_size: int
    total_pages: int