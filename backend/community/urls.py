from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, PostCommentViewSet, CommunityFollowViewSet

router = DefaultRouter()
router.register(r'posts', PostViewSet)
router.register(r'comments', PostCommentViewSet)
router.register(r'follows', CommunityFollowViewSet)

app_name = 'community'

urlpatterns = [
    path('', include(router.urls)),
]
