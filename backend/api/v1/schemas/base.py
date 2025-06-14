"""
Base schemas with common patterns
"""
from pydantic import BaseModel, ConfigDict
from typing import List, TypeVar, Generic, Optional
from datetime import datetime

T = TypeVar('T')


class TimestampMixin(BaseModel):
    """Mixin for models with timestamps"""
    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    results: List[T]
    count: int
    page: int
    page_size: int
    total_pages: int
    next: Optional[str] = None
    previous: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    code: Optional[str] = None


class IDMixin(BaseModel):
    """Mixin for models with ID"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int


class BaseORM(BaseModel):
    """Base class for ORM models"""
    model_config = ConfigDict(from_attributes=True)


class BaseSchema(BaseModel):
    """Base schema for API responses"""
    model_config = ConfigDict(from_attributes=True)


class ListResponse(BaseModel):
    """Base list response schema"""
    total: int
    limit: int
    offset: int
    
    model_config = ConfigDict(from_attributes=True)


class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = True
    message: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)