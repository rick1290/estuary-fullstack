from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, ReviewQuestionViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'review-questions', ReviewQuestionViewSet, basename='review-question')

app_name = 'reviews'

urlpatterns = [
    path('', include(router.urls)),
]