from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.community.views import (
    PostViewSet, PostCommentViewSet, CommunityFollowViewSet, CommunityTopicViewSet
)

app_name = 'community'

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', PostCommentViewSet, basename='comment')
router.register(r'follows', CommunityFollowViewSet, basename='follow')
router.register(r'topics', CommunityTopicViewSet, basename='topic')

urlpatterns = [
    path('', include(router.urls)),
]
