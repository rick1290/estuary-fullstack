from django.urls import path
from .views import (
    FileUploadView, 
    PractitionerProfileImageUploadView, 
    FileDeleteView,
    PractitionerProfileVideoUploadView
)

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('upload/practitioner-profile-image/', PractitionerProfileImageUploadView.as_view(), name='practitioner-profile-image-upload'),
    path('upload/practitioner-profile-video/', PractitionerProfileVideoUploadView.as_view(), name='practitioner-profile-video-upload'),
    path('delete/', FileDeleteView.as_view(), name='file-delete'),
]