"""
ASGI config for estuary project.

Pure Django ASGI configuration with WebSocket support.
All API endpoints now served by Django REST Framework.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")

# Get Django ASGI application
django_application = get_asgi_application()

# Import WebSocket consumers
from messaging.consumers import ChatConsumer
from notifications.consumers import NotificationConsumer

# Create the ASGI application with protocol routing
application = ProtocolTypeRouter({
    "http": django_application,  # All HTTP requests go to Django
    "websocket": URLRouter([
        path("ws/chat/<str:room_name>/", ChatConsumer.as_asgi()),
        path("ws/notifications/", NotificationConsumer.as_asgi()),
    ]),
})
