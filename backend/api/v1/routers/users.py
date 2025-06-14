"""
Users router
"""
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.core.paginator import Paginator
from django.db.models import Q
from asgiref.sync import sync_to_async
from api.dependencies import (
    get_current_user,
    get_current_superuser,
    get_pagination_params,
    PaginationParams
)
from api.v1.schemas.users import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
)

User = get_user_model()
router = APIRouter()


# Helper functions for complex ORM operations
@sync_to_async
def get_users_list(pagination: PaginationParams, is_active: Optional[bool], search: Optional[str]):
    """Get paginated list of users with filters"""
    queryset = User.objects.all()
    
    # Apply filters
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    
    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search)
        )
    
    # Apply ordering
    if pagination.ordering:
        queryset = queryset.order_by(pagination.ordering)
    else:
        queryset = queryset.order_by("-date_joined")
    
    # Paginate
    paginator = Paginator(queryset, pagination.page_size)
    page_obj = paginator.get_page(pagination.page)
    
    # Prepare response data
    results = [
        {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
        }
        for user in page_obj
    ]
    
    return {
        'results': results,
        'count': paginator.count,
        'page': pagination.page,
        'page_size': pagination.page_size,
        'total_pages': paginator.num_pages
    }


@sync_to_async
@transaction.atomic
def create_user_db(user_data: UserCreate):
    """Create a new user in database"""
    # Check if user already exists
    if User.objects.filter(email=user_data.email).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    user = User.objects.create(
        username=user_data.email,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        password=make_password(user_data.password),
        is_active=user_data.is_active,
    )
    
    return user


@sync_to_async
def get_user_by_id(user_id: int):
    """Get user by ID"""
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


@sync_to_async
def update_user_db(user_id: int, user_data: UserUpdate, is_superuser: bool):
    """Update user in database"""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    
    if "email" in update_data:
        # Check if new email is already taken
        if User.objects.filter(email=update_data["email"]).exclude(id=user_id).exists():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        user.email = update_data["email"]
        user.username = update_data["email"]  # Keep username in sync
    
    if "first_name" in update_data:
        user.first_name = update_data["first_name"]
    
    if "last_name" in update_data:
        user.last_name = update_data["last_name"]
    
    if "is_active" in update_data and is_superuser:
        user.is_active = update_data["is_active"]
    
    user.save()
    return user


@sync_to_async
def delete_user_db(user_id: int, current_user_id: int):
    """Delete user from database"""
    try:
        user = User.objects.get(id=user_id)
        
        # Prevent deleting self
        if user.id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        user.delete()
        
    except User.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


@router.get("/", response_model=UserListResponse)
async def list_users(
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    current_user: Annotated[User, Depends(get_current_superuser)],
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
):
    """List all users (admin only)"""
    result = await get_users_list(pagination, is_active, search)
    
    return UserListResponse(
        results=[UserResponse.model_validate(user_data) for user_data in result['results']],
        count=result['count'],
        page=result['page'],
        page_size=result['page_size'],
        total_pages=result['total_pages']
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: Annotated[User, Depends(get_current_superuser)]
):
    """Create a new user (admin only)"""
    try:
        user = await create_user_db(user_data)
        return UserResponse.model_validate(user)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get user by ID"""
    # Users can view their own profile or admins can view any profile
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = await get_user_by_id(user_id)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Update user"""
    # Users can update their own profile or admins can update any profile
    if user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = await update_user_db(user_id, user_data, current_user.is_superuser)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_superuser)]
):
    """Delete user (admin only)"""
    await delete_user_db(user_id, current_user.id)