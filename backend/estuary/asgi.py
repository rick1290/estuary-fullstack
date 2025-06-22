"""
ASGI config for estuary project.

Pure Django ASGI configuration with WebSocket support.
All API endpoints now served by Django REST Framework.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")

# Get Django ASGI application
django_application = get_asgi_application()

# Import after Django setup
from messaging.routing import websocket_urlpatterns as messaging_ws_patterns
from notifications.routing import websocket_urlpatterns as notification_ws_patterns
from messaging.middleware import TokenAuthMiddlewareStack

# Combine all WebSocket URL patterns
websocket_patterns = []
websocket_patterns.extend(messaging_ws_patterns)
websocket_patterns.extend(notification_ws_patterns)

# Create the ASGI application with protocol routing
application = ProtocolTypeRouter({
    "http": django_application,  # All HTTP requests go to Django
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(websocket_patterns)
    ),
})
