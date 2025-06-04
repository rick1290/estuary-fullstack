from django.urls import path
from .views import (
    YouTubeVideoListView,
    YouTubeVideoUploadView,
    YouTubeVideoProcessView,
    YouTubeVideoPrivacyUpdateView
)

urlpatterns = [
    path('videos/', YouTubeVideoListView.as_view(), name='youtube-video-list'),
    path('videos/upload/', YouTubeVideoUploadView.as_view(), name='youtube-video-upload'),
    path('videos/<uuid:video_id>/process/', YouTubeVideoProcessView.as_view(), name='youtube-video-process'),
    path('videos/privacy-update/', YouTubeVideoPrivacyUpdateView.as_view(), name='youtube-video-privacy-update'),
]
