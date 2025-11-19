from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GeneratedImageViewSet

router = DefaultRouter()
router.register(r'ai-images', GeneratedImageViewSet, basename='ai-images')

urlpatterns = [
    path('', include(router.urls)),
]
