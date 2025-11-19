from rest_framework import serializers
from ai_images.models import GeneratedImage


class GenerateImageRequestSerializer(serializers.Serializer):
    """Serializer for image generation request"""
    prompt = serializers.CharField(
        max_length=1000,
        required=True,
        help_text="Description of the image to generate"
    )


class GeneratedImageSerializer(serializers.ModelSerializer):
    """Serializer for GeneratedImage model"""
    image_url = serializers.SerializerMethodField()
    practitioner_name = serializers.CharField(
        source='practitioner.display_name',
        read_only=True
    )

    class Meta:
        model = GeneratedImage
        fields = [
            'id',
            'practitioner',
            'practitioner_name',
            'user_prompt',
            'image',
            'image_url',
            'service',
            'model_used',
            'generation_time_seconds',
            'is_applied',
            'created_at',
            'applied_at'
        ]
        read_only_fields = [
            'id',
            'practitioner',
            'practitioner_name',
            'image',
            'image_url',
            'model_used',
            'generation_time_seconds',
            'created_at'
        ]

    def get_image_url(self, obj):
        """Return full URL of the image"""
        return obj.image_url


class GenerateImageResponseSerializer(serializers.Serializer):
    """Serializer for successful image generation response"""
    id = serializers.IntegerField()
    image_url = serializers.URLField()
    prompt = serializers.CharField(source='user_prompt')
    generation_time_seconds = serializers.FloatField()
    message = serializers.CharField(default="Image generated successfully")
