"""
Custom authentication classes
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that matches our existing token format
    and provides better error messages
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        header = self.get_header(request)
        if header is None:
            return None
            
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
            
        # Validate token
        validated_token = self.get_validated_token(raw_token)
        
        # Get user from token
        user = self.get_user(validated_token)
        
        # Check if user is active
        if not user.is_active:
            raise AuthenticationFailed(_('User account is disabled.'))
        
        return user, validated_token
    
    def get_validated_token(self, raw_token):
        """
        Validates an encoded JSON web token and returns a validated token
        wrapper object.
        """
        messages = []
        
        try:
            return super().get_validated_token(raw_token)
        except TokenError as e:
            messages.append({
                'token_class': e.token.__class__.__name__,
                'token_type': getattr(e.token, 'token_type', 'access'),
                'message': e.args[0],
            })
            
        raise InvalidToken({
            'detail': _('Given token not valid for any token type'),
            'messages': messages,
        })


class OptionalJWTAuthentication(CustomJWTAuthentication):
    """
    JWT authentication that doesn't fail if no token is provided
    Used for endpoints that should work for both authenticated and anonymous users
    """
    
    def authenticate(self, request):
        """
        Try to authenticate but return None if no credentials
        """
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None