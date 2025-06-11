"""
Custom JWT Authentication for Django REST Framework
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework import HTTP_HEADER_ENCODING
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that handles token validation
    and user retrieval for Django REST Framework
    """
    
    auth_header_types = ('Bearer',)
    
    def get_header(self, request):
        """
        Extracts the header containing the JSON web token from the given request.
        """
        header = request.META.get('HTTP_AUTHORIZATION')
        
        if isinstance(header, str):
            # Work around django test client oddness
            header = header.encode(HTTP_HEADER_ENCODING)
        
        return header
    
    def get_raw_token(self, header):
        """
        Extracts an unvalidated JSON web token from the given "Authorization"
        HTTP header value.
        """
        parts = header.split()
        
        if len(parts) == 0:
            # Empty AUTHORIZATION header sent
            return None
        
        if parts[0].decode(HTTP_HEADER_ENCODING) not in self.auth_header_types:
            # Assume the header does not contain a JSON web token
            return None
        
        if len(parts) != 2:
            raise InvalidToken('Authorization header must contain two space-delimited values')
        
        return parts[1]
    
    def get_validated_token(self, raw_token):
        """
        Validates an encoded JSON web token and returns a validated token
        wrapper object.
        """
        messages = []
        for AuthToken in self.get_auth_token_classes():
            try:
                return AuthToken(raw_token)
            except TokenError as e:
                messages.append({'token_class': AuthToken.__name__,
                                'token_type': AuthToken.token_type,
                                'message': e.args[0]})
        
        raise InvalidToken({
            'detail': 'Given token not valid for any token type',
            'messages': messages,
        })
    
    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        """
        try:
            user_id = validated_token[self.get_user_id_claim()]
        except KeyError:
            raise InvalidToken('Token contained no recognizable user identification')
        
        try:
            user = User.objects.get(**{self.get_user_id_field(): user_id})
        except User.DoesNotExist:
            raise InvalidToken('User not found')
        
        if not user.is_active:
            raise InvalidToken('User is inactive')
        
        return user
    
    def get_auth_token_classes(self):
        """
        Returns the list of auth token classes to attempt to authenticate with.
        """
        from rest_framework_simplejwt.tokens import AccessToken
        return [AccessToken]
    
    def get_user_id_claim(self):
        """
        Returns the claim used to get the user ID from the token.
        """
        return 'user_id'
    
    def get_user_id_field(self):
        """
        Returns the field used to identify users.
        """
        return 'id'