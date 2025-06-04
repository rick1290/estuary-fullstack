from rest_framework import serializers
import os


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for file uploads to Cloudflare R2.
    """
    file = serializers.FileField()
    directory = serializers.CharField(required=False, default='uploads')


class FileDeleteSerializer(serializers.Serializer):
    """
    Serializer for file deletion from Cloudflare R2.
    """
    file_path = serializers.CharField()


class PractitionerProfileImageUploadSerializer(serializers.Serializer):
    """
    Serializer for practitioner profile image uploads.
    """
    image = serializers.ImageField()
    practitioner_id = serializers.CharField()


class PractitionerProfileVideoUploadSerializer(serializers.Serializer):
    """
    Serializer for practitioner profile video uploads with size validation.
    """
    video = serializers.FileField()
    practitioner_id = serializers.CharField()
    
    def validate_video(self, value):
        """
        Validate the video file type.
        """
        # Check file extension
        valid_extensions = ['.mp4', '.mov', '.avi', '.webm']
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError(
                f"Unsupported file extension. Allowed extensions are: {', '.join(valid_extensions)}"
            )
        
        # Content type validation
        valid_content_types = [
            'video/mp4', 
            'video/quicktime', 
            'video/x-msvideo', 
            'video/webm'
        ]
        if value.content_type not in valid_content_types:
            raise serializers.ValidationError(
                f"Unsupported content type. Allowed types are: {', '.join(valid_content_types)}"
            )
        
        return value