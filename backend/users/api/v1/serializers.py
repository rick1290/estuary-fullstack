"""
User authentication serializers for Django REST Framework
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """User registration serializer"""
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name', 'phone_number')
        extra_kwargs = {
            'first_name': {'required': True, 'allow_blank': False},
            'last_name': {'required': True, 'allow_blank': False},
        }
    
    def validate(self, attrs):
        """Validate passwords match and meet requirements"""
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)
        
        if password != password_confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Validate password strength
        try:
            validate_password(password)
        except ValidationError as e:
            raise serializers.ValidationError({"password": e.messages})
        
        return attrs
    
    def create(self, validated_data):
        """Create new user"""
        password = validated_data.pop('password')
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    """User login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    full_name = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    practitioner_public_id = serializers.SerializerMethodField()
    practitioner_id = serializers.SerializerMethodField()
    practitioner_slug = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'uuid', 'email', 'first_name', 'last_name', 'full_name', 'display_name',
            'phone_number', 'phone_number_verified', 'timezone', 'is_practitioner',
            'practitioner_public_id', 'practitioner_id', 'practitioner_slug',
            'account_status', 'last_login', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
        )
        read_only_fields = (
            'id', 'uuid', 'email', 'phone_number_verified', 'is_practitioner',
            'practitioner_public_id', 'practitioner_id', 'practitioner_slug',
            'account_status', 'last_login', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
        )
    
    def get_practitioner_public_id(self, obj):
        """Get practitioner public ID if user is a practitioner"""
        if hasattr(obj, 'practitioner_profile') and obj.practitioner_profile:
            return str(obj.practitioner_profile.public_uuid)
        return None
    
    def get_practitioner_id(self, obj):
        """Get practitioner ID if user is a practitioner"""
        if hasattr(obj, 'practitioner_profile') and obj.practitioner_profile:
            return obj.practitioner_profile.id
        return None
    
    def get_practitioner_slug(self, obj):
        """Get practitioner slug if user is a practitioner"""
        if hasattr(obj, 'practitioner_profile') and obj.practitioner_profile:
            return obj.practitioner_profile.slug
        return None


class TokenResponseSerializer(serializers.Serializer):
    """Token response serializer matching FastAPI format"""
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    token_type = serializers.CharField(default='bearer')
    expires_in = serializers.IntegerField(default=1800)  # 30 minutes in seconds
    user = UserProfileSerializer()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer to match FastAPI response format"""
    
    def validate(self, attrs):
        super().validate(attrs)
        
        # Get the user object
        user = self.user
        
        # Create refresh token to get both access and refresh
        refresh = RefreshToken.for_user(user)
        
        # Return response in FastAPI format
        return {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'bearer',
            'expires_in': 1800,  # 30 minutes
            'user': UserProfileSerializer(user).data
        }


class PasswordChangeSerializer(serializers.Serializer):
    """Password change serializer"""
    current_password = serializers.CharField(style={'input_type': 'password'})
    new_password = serializers.CharField(
        min_length=8,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(style={'input_type': 'password'})
    
    def validate(self, attrs):
        """Validate passwords"""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        
        # Validate password strength
        try:
            validate_password(new_password)
        except ValidationError as e:
            raise serializers.ValidationError({"new_password": e.messages})
        
        return attrs
    
    def validate_current_password(self, value):
        """Validate current password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class MessageResponseSerializer(serializers.Serializer):
    """Generic message response serializer"""
    message = serializers.CharField()
    success = serializers.BooleanField(default=True)


class GoogleAuthSerializer(serializers.Serializer):
    """Google OAuth authentication serializer"""
    id_token = serializers.CharField(
        help_text="Google ID token from OAuth flow"
    )