"""
LiveKit webhook URLs.
"""
from django.urls import path
from rooms.livekit.webhooks import livekit_webhook

urlpatterns = [
    path('webhooks/livekit/', livekit_webhook, name='livekit-webhook'),
]
