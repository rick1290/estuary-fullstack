from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reviews.api.v1.views import (
    ReviewViewSet, ReviewQuestionViewSet, ReviewVoteViewSet, ReviewReportViewSet
)

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'questions', ReviewQuestionViewSet, basename='review-question')
router.register(r'votes', ReviewVoteViewSet, basename='review-vote')
router.register(r'reports', ReviewReportViewSet, basename='review-report')

urlpatterns = [
    path('', include(router.urls)),
]
