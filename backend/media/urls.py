"""
Media app URL configuration
"""
from django.urls import path, include

app_name = 'media'

urlpatterns = [
    path('api/v1/', include('media.api.v1.urls')),
]