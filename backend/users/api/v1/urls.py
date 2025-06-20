"""
URL configuration for user authentication API
"""
from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    TokenRefreshView,
    LogoutView,
    CurrentUserView,
    ChangePasswordView,
    logout_simple,
    user_stats,
    user_favorites,
    add_favorite,
    remove_favorite,
)

app_name = 'users_api_v1'

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('logout/simple/', logout_simple, name='logout_simple'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User profile endpoints
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('stats/', user_stats, name='user_stats'),
    
    # Favorites endpoints
    path('favorites/', user_favorites, name='user_favorites'),
    path('favorites/add/', add_favorite, name='add_favorite'),
    path('favorites/<int:practitioner_id>/remove/', remove_favorite, name='remove_favorite'),
]