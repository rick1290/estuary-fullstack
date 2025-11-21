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
        # Get the response from the parent class
        response = super().post(request, *args, **kwargs)
        
        # If successful and refresh token rotation is enabled,
        # ensure the response includes the new refresh token
        if response.status_code == 200:
            data = response.data
            # The parent class should already include 'refresh' if rotation is enabled
            # but let's make sure the response format is consistent
            if 'access' in data and 'refresh' not in data:
                # If refresh token is not in response but we have rotation enabled,
                # this shouldn't happen with proper SimpleJWT configuration
                pass
            
            # Log successful refresh for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Token refreshed for user (has refresh: {'refresh' in data})")
        
        return response


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
        service_session__start_time__gte=timezone.now()
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


# Recommendations endpoint
@extend_schema(
    operation_id='user_recommendations',
    summary='Get personalized recommendations',
    description='Get recommended services and practitioners based on user modality preferences. Falls back to featured/popular items if no preferences set.',
    responses={
        200: OpenApiResponse(description='Personalized recommendations'),
        401: OpenApiResponse(description='Not authenticated'),
    },
    tags=['User']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_recommendations(request):
    """Get personalized recommendations for the authenticated user"""
    from users.models import UserModalityPreference
    from services.models import Service
    from practitioners.models import Practitioner
    from django.db.models import Avg, Count, Case, When, IntegerField

    # Get limit from query params (default 6)
    services_limit = int(request.query_params.get('services_limit', 6))
    practitioners_limit = int(request.query_params.get('practitioners_limit', 6))

    # Get user's modality preferences ordered by priority
    user_modalities = UserModalityPreference.objects.filter(
        user=request.user
    ).select_related('modality').order_by('priority')

    modality_ids = [pref.modality_id for pref in user_modalities]

    recommended_services = []
    recommended_practitioners = []
    recommendation_reason = 'personalized'

    if modality_ids:
        # Build priority ordering for modalities
        # Services with higher priority modalities appear first
        priority_cases = [
            When(modalities__id=mod_id, then=idx)
            for idx, mod_id in enumerate(modality_ids)
        ]

        # Get services matching user's modalities
        services_qs = Service.objects.filter(
            is_active=True,
            status='active',
            modalities__id__in=modality_ids
        ).annotate(
            modality_priority=Case(
                *priority_cases,
                default=999,
                output_field=IntegerField()
            ),
            reviews_count=Count('reviews'),
            avg_rating=Avg('reviews__rating')
        ).select_related(
            'primary_practitioner__user',
            'category'
        ).prefetch_related('modalities').distinct().order_by(
            'modality_priority',
            '-is_featured',
            '-avg_rating'
        )[:services_limit]

        # Get practitioners matching user's modalities
        practitioners_qs = Practitioner.objects.filter(
            practitioner_status='active',
            is_verified=True,
            modalities__id__in=modality_ids
        ).annotate(
            modality_priority=Case(
                *priority_cases,
                default=999,
                output_field=IntegerField()
            ),
            reviews_count=Count('reviews'),
            avg_rating=Avg('reviews__rating'),
            services_count=Count('primary_services', filter=Q(primary_services__is_active=True))
        ).select_related('user').prefetch_related('modalities').distinct().order_by(
            'modality_priority',
            '-featured',
            '-avg_rating'
        )[:practitioners_limit]

        recommended_services = list(services_qs)
        recommended_practitioners = list(practitioners_qs)

    # Fallback if no modality preferences or not enough results
    if len(recommended_services) < services_limit:
        recommendation_reason = 'featured' if not modality_ids else 'personalized'

        # Get featured services first, then popular ones
        exclude_ids = [s.id for s in recommended_services]
        fallback_services = Service.objects.filter(
            is_active=True,
            status='active'
        ).exclude(
            id__in=exclude_ids
        ).annotate(
            reviews_count=Count('reviews'),
            avg_rating=Avg('reviews__rating'),
            bookings_count=Count('bookings')
        ).select_related(
            'primary_practitioner__user',
            'category'
        ).prefetch_related('modalities').order_by(
            '-is_featured',
            '-avg_rating',
            '-bookings_count'
        )[:services_limit - len(recommended_services)]

        recommended_services.extend(list(fallback_services))

    if len(recommended_practitioners) < practitioners_limit:
        # Get featured practitioners first, then popular ones
        exclude_ids = [p.id for p in recommended_practitioners]
        fallback_practitioners = Practitioner.objects.filter(
            practitioner_status='active',
            is_verified=True
        ).exclude(
            id__in=exclude_ids
        ).annotate(
            reviews_count=Count('reviews'),
            avg_rating=Avg('reviews__rating'),
            services_count=Count('primary_services', filter=Q(primary_services__is_active=True))
        ).select_related('user').prefetch_related('modalities').order_by(
            '-featured',
            '-avg_rating',
            '-reviews_count'
        )[:practitioners_limit - len(recommended_practitioners)]

        recommended_practitioners.extend(list(fallback_practitioners))

    # Serialize the results
    services_data = []
    for service in recommended_services:
        practitioner = service.primary_practitioner
        services_data.append({
            'id': service.id,
            'slug': service.slug,
            'name': service.name,
            'short_description': service.short_description,
            'price_cents': service.price_cents,
            'duration_minutes': service.duration_minutes,
            'image_url': service.image_url,
            'average_rating': getattr(service, 'avg_rating', None),
            'total_reviews': getattr(service, 'reviews_count', 0),
            'is_featured': service.is_featured,
            'service_type_code': service.service_type.code if service.service_type else None,
            'category': {
                'id': service.category.id,
                'name': service.category.name,
                'slug': service.category.slug
            } if service.category else None,
            'modalities': [
                {'id': m.id, 'name': m.name, 'slug': m.slug}
                for m in service.modalities.all()
            ],
            'practitioner': {
                'id': practitioner.id,
                'display_name': practitioner.display_name or f"{practitioner.user.first_name} {practitioner.user.last_name}".strip(),
                'slug': practitioner.slug,
                'profile_image_url': practitioner.profile_image_url,
            } if practitioner else None
        })

    practitioners_data = []
    for practitioner in recommended_practitioners:
        practitioners_data.append({
            'id': practitioner.id,
            'slug': practitioner.slug,
            'display_name': practitioner.display_name or f"{practitioner.user.first_name} {practitioner.user.last_name}".strip(),
            'professional_title': practitioner.professional_title,
            'bio': practitioner.bio,
            'profile_image_url': practitioner.profile_image_url,
            'is_verified': practitioner.is_verified,
            'is_featured': practitioner.featured,
            'average_rating': getattr(practitioner, 'avg_rating', None),
            'total_reviews': getattr(practitioner, 'reviews_count', 0),
            'services_count': getattr(practitioner, 'services_count', 0),
            'modalities': [
                {'id': m.id, 'name': m.name, 'slug': m.slug}
                for m in practitioner.modalities.all()
            ],
        })

    # Get the modalities the user selected for context
    user_modalities_data = [
        {'id': pref.modality.id, 'name': pref.modality.name, 'slug': pref.modality.slug}
        for pref in user_modalities
    ]

    return Response({
        'recommendation_reason': recommendation_reason,
        'user_modalities': user_modalities_data,
        'services': services_data,
        'practitioners': practitioners_data
    })