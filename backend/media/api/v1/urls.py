"""
Media API URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaViewSet

app_name = 'media'

router = DefaultRouter()
router.register(r'media', MediaViewSet, basename='media')

urlpatterns = [
    path('', include(router.urls)),
]