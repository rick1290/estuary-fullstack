from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that takes a token from the query string and authenticates the user.
    """
    async def __call__(self, scope, receive, send):
        # Get the token from the query string
        query_string = scope.get('query_string', b'').decode()
        query_params = dict(param.split('=') for param in query_string.split('&') if param)
        
        token = query_params.get('token', None)
        scope['user'] = AnonymousUser()
        
        if token:
            try:
                # Validate the token and get the user
                user = await self.get_user_from_token(token)
                scope['user'] = user
            except (InvalidToken, TokenError, User.DoesNotExist):
                pass
        
        return await super().__call__(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """
        Get the user from the token.
        """
        access_token = AccessToken(token)
        user_id = access_token.payload.get('user_id')
        return User.objects.get(id=user_id)


def TokenAuthMiddlewareStack(inner):
    """
    Convenience function to wrap the middleware.
    """
    return TokenAuthMiddleware(inner)
