"""
ASGI mounting utility for integrating FastAPI with Django.
"""
import os
from django.core.asgi import get_asgi_application
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Ensure Django is setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')

# Get Django ASGI application
django_asgi_app = get_asgi_application()


class DjangoFastAPIMount:
    """
    ASGI application that mounts FastAPI within Django.
    """
    
    def __init__(self, django_app, fastapi_app: FastAPI, mount_path: str = "/stripe/fastapi"):
        self.django_app = django_app
        self.fastapi_app = fastapi_app
        self.mount_path = mount_path
        
    async def __call__(self, scope, receive, send):
        """
        Route requests to either Django or FastAPI based on path.
        """
        path = scope.get("path", "")
        
        # Check if this request should go to FastAPI
        if path.startswith(self.mount_path):
            # Adjust the path for FastAPI
            scope["path"] = path[len(self.mount_path):]
            if not scope["path"]:
                scope["path"] = "/"
                
            # Add Django user to scope if available
            if "user" in scope:
                # Store Django user in ASGI scope for FastAPI to access
                scope["django_user"] = scope["user"]
                
            # Call FastAPI app
            await self.fastapi_app(scope, receive, send)
        else:
            # Call Django app
            await self.django_app(scope, receive, send)


def create_integrated_asgi_app():
    """
    Create an ASGI app that integrates Django and FastAPI.
    """
    from .api.app import app as fastapi_app
    
    # Create the integrated app
    integrated_app = DjangoFastAPIMount(
        django_app=django_asgi_app,
        fastapi_app=fastapi_app,
        mount_path="/stripe/fastapi"
    )
    
    return integrated_app


# Export the integrated app
application = create_integrated_asgi_app()