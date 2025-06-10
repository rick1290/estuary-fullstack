"""
Authentication router
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone
from asgiref.sync import sync_to_async
from api.dependencies import create_jwt, get_current_user
from api.v1.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    PasswordChangeRequest,
    MessageResponse,
)

User = get_user_model()
router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Login with email and password"""
    user = await sync_to_async(authenticate)(username=credentials.email, password=credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    # Create JWT token
    access_token = create_jwt(user.id)
    
    # Update last login
    user.last_login = timezone.now()
    await sync_to_async(user.save)(update_fields=["last_login"])
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login/oauth2", response_model=TokenResponse)
async def login_oauth2(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """OAuth2 compatible login endpoint"""
    user = await sync_to_async(authenticate)(username=form_data.username, password=form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    # Create JWT token
    access_token = create_jwt(user.id)
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest):
    """Register a new user"""
    # Check if user already exists
    user_exists = await sync_to_async(User.objects.filter(email=user_data.email).exists)()
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    try:
        @sync_to_async
        def create_user():
            with transaction.atomic():
                # Create user (BaseUser uses email as username)
                user = User.objects.create_user(
                    email=user_data.email,
                    password=user_data.password,
                    first_name=user_data.first_name,
                    last_name=user_data.last_name,
                )
                return user
        
        user = await create_user()
        
        # Create JWT token
        access_token = create_jwt(user.id)
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current user information"""
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Change current user's password"""
    # Verify current password
    password_is_valid = await sync_to_async(current_user.check_password)(password_data.current_password)
    if not password_is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Set new password
    await sync_to_async(current_user.set_password)(password_data.new_password)
    await sync_to_async(current_user.save)()
    
    return MessageResponse(message="Password changed successfully")


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: Annotated[User, Depends(get_current_user)]):
    """Logout current user (client should discard token)"""
    # In a JWT-based system, logout is typically handled client-side
    # by discarding the token. We can add token blacklisting here if needed.
    return MessageResponse(message="Logged out successfully")


