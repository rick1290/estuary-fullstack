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
    user_favorite_services,
    add_favorite_service,
    remove_favorite_service,
    user_modality_preferences,
    set_modality_preferences,
    add_modality_preference,
    remove_modality_preference,
    user_recommendations,
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
    
    # Practitioner favorites endpoints
    path('favorites/', user_favorites, name='user_favorites'),
    path('favorites/add/', add_favorite, name='add_favorite'),
    path('favorites/<int:practitioner_id>/remove/', remove_favorite, name='remove_favorite'),
    
    # Service favorites endpoints
    path('favorite-services/', user_favorite_services, name='user_favorite_services'),
    path('favorite-services/add/', add_favorite_service, name='add_favorite_service'),
    path('favorite-services/<int:service_id>/remove/', remove_favorite_service, name='remove_favorite_service'),
    
    # Modality preferences endpoints
    path('modality-preferences/', user_modality_preferences, name='user_modality_preferences'),
    path('modality-preferences/set/', set_modality_preferences, name='set_modality_preferences'),
    path('modality-preferences/add/', add_modality_preference, name='add_modality_preference'),
    path('modality-preferences/<int:modality_id>/remove/', remove_modality_preference, name='remove_modality_preference'),

    # Recommendations endpoint
    path('recommendations/', user_recommendations, name='user_recommendations'),
]