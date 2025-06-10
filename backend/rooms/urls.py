from django.urls import path, include
from rooms.livekit.webhooks import livekit_webhook

app_name = 'rooms'

urlpatterns = [
    # API endpoints
    path('api/v1/', include('rooms.api.v1.urls')),
    
    # LiveKit webhooks
    path('webhooks/livekit/', livekit_webhook, name='livekit_webhook'),
]