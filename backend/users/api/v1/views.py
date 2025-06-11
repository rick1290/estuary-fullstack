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