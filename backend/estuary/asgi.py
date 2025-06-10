"""
ASGI config for estuary project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/

IMPORTANT ARCHITECTURAL NOTE:
This ASGI configuration implements a hybrid routing approach that serves both 
Django (admin, static files) and FastAPI endpoints from a single process.

Current Architecture:
- Admin Service (port 8000): Serves Django admin + FastAPI endpoints + WebSockets
- API Service (port 8001): Serves FastAPI endpoints only (now redundant)

The hybrid routing makes the separate API service on port 8001 optional since
the admin service can now handle all requests:
- /admin/* → Django application
- /static/* → Django application  
- /api/v1/* → FastAPI application
- Everything else → FastAPI application

To switch back to separate services:
1. Remove the hybrid http_router below
2. Change application back to simple ProtocolTypeRouter with fastapi_app for http
3. Keep both services in docker-compose.yml
4. Continue using Nginx to route between services

To fully embrace hybrid approach:
1. Remove the 'api' service from docker-compose.yml
2. Update Nginx to route all traffic to port 8000
3. Optionally rename 'admin' service to 'backend' or 'app'
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")

# Get Django ASGI application first (important for Django setup)
django_application = get_asgi_application()

# Import the FastAPI app from api.main
from api.main import app as fastapi_app

# Update FastAPI docs URL to be at root /docs instead of /api/docs
fastapi_app.docs_url = "/docs"
fastapi_app.redoc_url = "/redoc"
fastapi_app.openapi_url = "/openapi.json"

# For Django Channels WebSocket support
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from messaging.consumers import ChatConsumer

# Mount Stripe API if available
try:
    from integrations.stripe.api.app import stripe_app
    fastapi_app.mount("/stripe/api/v1", stripe_app)
except ImportError:
    pass

# Create a hybrid ASGI application that serves both Django and FastAPI
from channels.routing import URLRouter
from django.urls import re_path

# Define HTTP routing that serves Django admin and FastAPI
http_router = URLRouter([
    # Django admin and static files
    re_path(r"^admin/", django_application),
    re_path(r"^static/", django_application),
    # All other paths go to FastAPI
    re_path(r"^", fastapi_app),
])

# Create the ASGI application with protocol routing
application = ProtocolTypeRouter({
    "http": http_router,
    "websocket": URLRouter([
        path("ws/chat/<str:room_name>/", ChatConsumer.as_asgi()),
    ]),
})
