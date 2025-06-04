from rest_framework import serializers
from apps.integrations.youtube.models import YouTubeVideo


class YouTubeVideoSerializer(serializers.ModelSerializer):
    """
    Serializer for YouTube video model.
    """
    class Meta:
        model = YouTubeVideo
        fields = [
            'id', 'created_at', 'updated_at', 'youtube_video_id', 
            'title', 'description', 'source_file_url', 'practitioner',
            'status', 'error_message', 'privacy_status', 'apply_video_processing'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'youtube_video_id', 'status', 'error_message']


class PractitionerVideoUploadSerializer(serializers.Serializer):
    """
    Serializer for initiating a YouTube upload from a practitioner's R2 video.
    """
    practitioner_id = serializers.CharField(required=True)
    video_url = serializers.URLField(required=True, help_text="URL to the video in Cloudflare R2")
    title = serializers.CharField(required=False, max_length=255, help_text="Custom title (optional)")
    description = serializers.CharField(required=False, help_text="Custom description (optional)")
    apply_video_processing = serializers.BooleanField(required=False, default=True, help_text="Apply logo overlay and branding to the video")
    

class VideoPrivacyUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating a YouTube video's privacy status.
    """
    youtube_video_id = serializers.CharField(required=True)
    privacy_status = serializers.ChoiceField(
        choices=['private', 'unlisted', 'public'],
        required=True
    )
