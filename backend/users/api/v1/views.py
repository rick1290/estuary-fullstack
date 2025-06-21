"""
User authentication views for Django REST Framework
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from django.db.models import Count, Q
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    TokenResponseSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    MessageResponseSerializer,
)

User = get_user_model()


@extend_schema_view(
    create=extend_schema(tags=['Authentication'])
)
class RegisterView(generics.CreateAPIView):
    """User registration endpoint"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        operation_id='auth_register',
        summary='Register new user',
        description='Create a new user account and return authentication tokens',
        responses={
            201: OpenApiResponse(response=TokenResponseSerializer, description='User created successfully'),
            400: OpenApiResponse(description='Validation error'),
        },
        tags=['Authentication']
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the user
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        response_data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'bearer',
            'expires_in': 1800,  # 30 minutes
            'user': UserProfileSerializer(user).data
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """User login endpoint"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        operation_id='auth_login',
        summary='User login',
        description='Authenticate user with email and password',
        request=UserLoginSerializer,
        responses={
            200: OpenApiResponse(response=TokenResponseSerializer, description='Login successful'),
            401: OpenApiResponse(description='Invalid credentials'),
            403: OpenApiResponse(description='Account disabled'),
        },
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        # Update last login time when login is successful
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Extract user from the serializer after successful validation
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                user = serializer.user
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
        
        return response


class TokenRefreshView(BaseTokenRefreshView):
    """Token refresh endpoint"""
    
    @extend_schema(
        operation_id='auth_refresh',
        summary='Refresh access token',
        description='Get new access token using refresh token',
        responses={
            200: OpenApiResponse(description='Token refreshed successfully'),
            401: OpenApiResponse(description='Invalid refresh token'),
        },
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """User logout endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        operation_id='auth_logout',
        summary='User logout',
        description='Blacklist refresh token to logout user',
        responses={
            200: OpenApiResponse(response=MessageResponseSerializer, description='Logout successful'),
            400: OpenApiResponse(description='Invalid refresh token'),
        },
        tags=['Authentication']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                "message": "Logged out successfully",
                "success": True
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                "message": "Invalid refresh token",
                "success": False
            }, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Current user profile endpoint"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    @extend_schema(
        operation_id='auth_me',
        summary='Get current user',
        description='Get current authenticated user profile',
        responses={
            200: OpenApiResponse(response=UserProfileSerializer, description='User profile'),
            401: OpenApiResponse(description='Not authenticated'),
        },
        tags=['Authentication']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        operation_id='auth_update_profile',
        summary='Update user profile',
        description='Update current user profile information',
        responses={
            200: OpenApiResponse(response=UserProfileSerializer, description='Profile updated'),
            400: OpenApiResponse(description='Validation error'),
            401: OpenApiResponse(description='Not authenticated'),
        },
        tags=['Authentication']
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """Change password endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        operation_id='auth_change_password',
        summary='Change password',
        description='Change current user password',
        request=PasswordChangeSerializer,
        responses={
            200: OpenApiResponse(response=MessageResponseSerializer, description='Password changed successfully'),
            400: OpenApiResponse(description='Validation error'),
            401: OpenApiResponse(description='Not authenticated'),
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                "message": "Password changed successfully",
                "success": True
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Alternative function-based view implementations for simpler endpoints
@extend_schema(
    operation_id='auth_logout_simple',
    summary='Simple logout',
    description='Simple logout endpoint (client should discard tokens)',
    responses={
        200: OpenApiResponse(response=MessageResponseSerializer, description='Logout successful'),
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_simple(request):
    """Simple logout endpoint - client handles token disposal"""
    return Response({
        "message": "Logged out successfully",
        "success": True
    }, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_stats',
    summary='Get user statistics',
    description='Get statistics for the authenticated user including bookings, favorites, and activity',
    responses={
        200: OpenApiResponse(description='User statistics'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_stats(request):
    """Get user dashboard statistics"""
    user = request.user
    
    # Import models we need
    from bookings.models import Booking
    from users.models import UserFavoritePractitioner, UserFavoriteService
    from services.models import Service
    
    # Get booking statistics
    total_bookings = Booking.objects.filter(user=user).count()
    completed_bookings = Booking.objects.filter(
        user=user,
        status='completed'
    ).count()
    upcoming_bookings = Booking.objects.filter(
        user=user,
        status='confirmed',
        start_time__gte=timezone.now()
    ).count()
    
    # Get favorites count
    favorite_practitioners = UserFavoritePractitioner.objects.filter(user=user).count()
    
    # Get saved services count
    favorite_services = UserFavoriteService.objects.filter(user=user).count()
    
    # Calculate a simple wellness score based on activity
    # This is a placeholder - you might want to implement a more sophisticated algorithm
    wellness_score = min(100, (completed_bookings * 10) + (upcoming_bookings * 5))
    
    stats = {
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'upcoming_bookings': upcoming_bookings,
        'favorite_practitioners': favorite_practitioners,
        'favorite_services': favorite_services,
        'wellness_score': wellness_score,
        'member_since': user.date_joined.isoformat(),
        'last_booking': None
    }
    
    # Get last booking date
    last_booking = Booking.objects.filter(
        user=user
    ).order_by('-created_at').first()
    
    if last_booking:
        stats['last_booking'] = last_booking.created_at.isoformat()
    
    return Response(stats, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_favorites',
    summary='Get user favorite practitioners',
    description='Get list of practitioners favorited by the authenticated user',
    responses={
        200: OpenApiResponse(description='List of favorite practitioners'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_favorites(request):
    """Get user's favorite practitioners"""
    from users.models import UserFavoritePractitioner
    from practitioners.api.v1.serializers import PractitionerListSerializer
    
    favorites = UserFavoritePractitioner.objects.filter(
        user=request.user
    ).select_related('practitioner__user').order_by('-created_at')
    
    # Extract practitioners and serialize them
    practitioners = [fav.practitioner for fav in favorites]
    serializer = PractitionerListSerializer(practitioners, many=True)
    
    return Response({
        'count': len(practitioners),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_add_favorite',
    summary='Add practitioner to favorites',
    description='Add a practitioner to the authenticated user favorites',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'practitioner_id': {'type': 'integer', 'description': 'ID of the practitioner to favorite'}
            },
            'required': ['practitioner_id']
        }
    },
    responses={
        201: OpenApiResponse(description='Practitioner added to favorites'),
        400: OpenApiResponse(description='Validation error'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Practitioner not found'),
    },
    tags=['User']
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_favorite(request):
    """Add a practitioner to favorites"""
    from users.models import UserFavoritePractitioner
    from practitioners.models import Practitioner
    
    practitioner_id = request.data.get('practitioner_id')
    if not practitioner_id:
        return Response(
            {'error': 'practitioner_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        practitioner = Practitioner.objects.get(id=practitioner_id)
    except Practitioner.DoesNotExist:
        return Response(
            {'error': 'Practitioner not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    favorite, created = UserFavoritePractitioner.objects.get_or_create(
        user=request.user,
        practitioner=practitioner
    )
    
    if created:
        return Response(
            {'message': 'Practitioner added to favorites'},
            status=status.HTTP_201_CREATED
        )
    else:
        return Response(
            {'message': 'Practitioner already in favorites'},
            status=status.HTTP_200_OK
        )


@extend_schema(
    operation_id='user_remove_favorite',
    summary='Remove practitioner from favorites',
    description='Remove a practitioner from the authenticated user favorites',
    responses={
        204: OpenApiResponse(description='Practitioner removed from favorites'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Favorite not found'),
    },
    tags=['User']
)
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_favorite(request, practitioner_id):
    """Remove a practitioner from favorites"""
    from users.models import UserFavoritePractitioner
    
    try:
        favorite = UserFavoritePractitioner.objects.get(
            user=request.user,
            practitioner_id=practitioner_id
        )
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserFavoritePractitioner.DoesNotExist:
        return Response(
            {'error': 'Favorite not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# Service favorites endpoints
@extend_schema(
    operation_id='user_favorite_services',
    summary='List favorite services',
    description='Get list of authenticated user favorite services',
    responses={
        200: OpenApiResponse(description='List of favorite services'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_favorite_services(request):
    """Get user's favorite services"""
    from users.models import UserFavoriteService
    from services.api.v1.serializers import ServiceListSerializer
    
    favorites = UserFavoriteService.objects.filter(
        user=request.user
    ).select_related(
        'service__primary_practitioner',
        'service__category'
    ).order_by('-created_at')
    
    # Extract services and serialize them
    services = [fav.service for fav in favorites]
    serializer = ServiceListSerializer(services, many=True, context={'request': request})
    
    return Response({
        'count': len(services),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_add_favorite_service',
    summary='Add service to favorites',
    description='Add a service to the authenticated user favorites',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'service_id': {'type': 'integer', 'description': 'ID of the service to favorite'}
            },
            'required': ['service_id']
        }
    },
    responses={
        201: OpenApiResponse(description='Service added to favorites'),
        400: OpenApiResponse(description='Validation error'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Service not found'),
    },
    tags=['User']
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_favorite_service(request):
    """Add a service to favorites"""
    from users.models import UserFavoriteService
    from services.models import Service
    
    service_id = request.data.get('service_id')
    if not service_id:
        return Response(
            {'error': 'service_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        service = Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return Response(
            {'error': 'Service not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    favorite, created = UserFavoriteService.objects.get_or_create(
        user=request.user,
        service=service
    )
    
    if created:
        return Response(
            {'message': 'Service added to favorites'},
            status=status.HTTP_201_CREATED
        )
    else:
        return Response(
            {'message': 'Service already in favorites'},
            status=status.HTTP_200_OK
        )


@extend_schema(
    operation_id='user_remove_favorite_service',
    summary='Remove service from favorites',
    description='Remove a service from the authenticated user favorites',
    responses={
        204: OpenApiResponse(description='Service removed from favorites'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Favorite not found'),
    },
    tags=['User']
)
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_favorite_service(request, service_id):
    """Remove a service from favorites"""
    from users.models import UserFavoriteService
    
    try:
        favorite = UserFavoriteService.objects.get(
            user=request.user,
            service_id=service_id
        )
        favorite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserFavoriteService.DoesNotExist:
        return Response(
            {'error': 'Favorite not found'},
            status=status.HTTP_404_NOT_FOUND
        )


# User modality preferences endpoints
@extend_schema(
    operation_id='user_modality_preferences',
    summary='List user modality preferences',
    description='Get list of authenticated user modality preferences (wellness interests)',
    responses={
        200: OpenApiResponse(description='List of user modality preferences'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_modality_preferences(request):
    """Get user's modality preferences"""
    from users.models import UserModalityPreference
    from practitioners.api.v1.serializers import ModalitySerializer
    
    preferences = UserModalityPreference.objects.filter(
        user=request.user
    ).select_related('modality').order_by('priority', 'created_at')
    
    # Extract modalities with priority info
    results = []
    for pref in preferences:
        modality_data = ModalitySerializer(pref.modality).data
        modality_data['priority'] = pref.priority
        results.append(modality_data)
    
    return Response({
        'count': len(results),
        'results': results
    }, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_set_modality_preferences',
    summary='Set user modality preferences',
    description='Set all user modality preferences (replaces existing preferences)',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'modality_ids': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of modality IDs in priority order (max 6)'
                }
            },
            'required': ['modality_ids']
        }
    },
    responses={
        200: OpenApiResponse(description='Preferences updated successfully'),
        400: OpenApiResponse(description='Validation error'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def set_modality_preferences(request):
    """Set user's modality preferences (replaces all existing)"""
    from users.models import UserModalityPreference
    from common.models import Modality
    
    modality_ids = request.data.get('modality_ids', [])
    
    # Validate input
    if not isinstance(modality_ids, list):
        return Response(
            {'error': 'modality_ids must be a list'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(modality_ids) > 6:
        return Response(
            {'error': 'Maximum 6 modalities allowed'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate all modalities exist
    valid_modalities = Modality.objects.filter(
        id__in=modality_ids,
        is_active=True
    ).values_list('id', flat=True)
    
    invalid_ids = set(modality_ids) - set(valid_modalities)
    if invalid_ids:
        return Response(
            {'error': f'Invalid modality IDs: {list(invalid_ids)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Delete existing preferences
    UserModalityPreference.objects.filter(user=request.user).delete()
    
    # Create new preferences with priority
    for priority, modality_id in enumerate(modality_ids):
        UserModalityPreference.objects.create(
            user=request.user,
            modality_id=modality_id,
            priority=priority
        )
    
    return Response({
        'message': 'Modality preferences updated successfully',
        'count': len(modality_ids)
    }, status=status.HTTP_200_OK)


@extend_schema(
    operation_id='user_add_modality_preference',
    summary='Add modality to preferences',
    description='Add a single modality to user preferences',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'modality_id': {'type': 'integer', 'description': 'ID of the modality to add'}
            },
            'required': ['modality_id']
        }
    },
    responses={
        201: OpenApiResponse(description='Modality added to preferences'),
        400: OpenApiResponse(description='Validation error or limit reached'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Modality not found'),
    },
    tags=['User']
)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_modality_preference(request):
    """Add a modality to preferences"""
    from users.models import UserModalityPreference
    from common.models import Modality
    
    modality_id = request.data.get('modality_id')
    if not modality_id:
        return Response(
            {'error': 'modality_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check current count
    current_count = UserModalityPreference.objects.filter(user=request.user).count()
    if current_count >= 6:
        return Response(
            {'error': 'Maximum 6 modalities allowed'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        modality = Modality.objects.get(id=modality_id, is_active=True)
    except Modality.DoesNotExist:
        return Response(
            {'error': 'Modality not found or inactive'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    preference, created = UserModalityPreference.objects.get_or_create(
        user=request.user,
        modality=modality,
        defaults={'priority': current_count}
    )
    
    if created:
        return Response(
            {'message': 'Modality added to preferences'},
            status=status.HTTP_201_CREATED
        )
    else:
        return Response(
            {'message': 'Modality already in preferences'},
            status=status.HTTP_200_OK
        )


@extend_schema(
    operation_id='user_remove_modality_preference',
    summary='Remove modality from preferences',
    description='Remove a modality from user preferences',
    responses={
        204: OpenApiResponse(description='Modality removed from preferences'),
        401: OpenApiResponse(description='Not authenticated'),
        404: OpenApiResponse(description='Preference not found'),
    },
    tags=['User']
)
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def remove_modality_preference(request, modality_id):
    """Remove a modality from preferences"""
    from users.models import UserModalityPreference
    
    try:
        preference = UserModalityPreference.objects.get(
            user=request.user,
            modality_id=modality_id
        )
        preference.delete()
        
        # Reorder remaining preferences
        remaining = UserModalityPreference.objects.filter(
            user=request.user
        ).order_by('priority')
        
        for i, pref in enumerate(remaining):
            pref.priority = i
            pref.save(update_fields=['priority'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserModalityPreference.DoesNotExist:
        return Response(
            {'error': 'Preference not found'},
            status=status.HTTP_404_NOT_FOUND
        )