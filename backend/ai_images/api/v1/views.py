from django.utils import timezone
from datetime import timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from ai_images.models import GeneratedImage
from ai_images.services import ImageGenerationService
from practitioners.models import Practitioner
from .serializers import (
    GenerateImageRequestSerializer,
    GeneratedImageSerializer,
    GenerateImageResponseSerializer
)


class GeneratedImageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for AI image generation and history.

    Practitioners can:
    - Generate new images from prompts
    - View their generation history
    - Retrieve specific generated images
    """
    serializer_class = GeneratedImageSerializer
    permission_classes = [IsAuthenticated]

    # Rate limiting settings
    MAX_GENERATIONS_PER_DAY = 10

    def get_queryset(self):
        """Return only the authenticated practitioner's generated images"""
        user = self.request.user

        try:
            practitioner = user.practitioner_profile
            return GeneratedImage.objects.filter(practitioner=practitioner)
        except Practitioner.DoesNotExist:
            return GeneratedImage.objects.none()

    def check_rate_limit(self, practitioner):
        """Check if practitioner has exceeded daily generation limit"""
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        generations_today = GeneratedImage.objects.filter(
            practitioner=practitioner,
            created_at__gte=today_start
        ).count()

        if generations_today >= self.MAX_GENERATIONS_PER_DAY:
            return False, generations_today

        return True, generations_today

    @extend_schema(
        request=GenerateImageRequestSerializer,
        responses={
            201: GenerateImageResponseSerializer,
            400: {'description': 'Invalid request or rate limit exceeded'},
            403: {'description': 'Not a practitioner'},
            500: {'description': 'Image generation failed'}
        },
        description="Generate a new AI image from a text prompt. Limited to 10 generations per day."
    )
    @action(detail=False, methods=['post'], url_path='generate')
    def generate_image(self, request):
        """
        Generate a new image from a text prompt.

        POST /api/v1/ai-images/generate/
        Body: { "prompt": "A serene meditation space with natural lighting" }
        """
        # Validate user is a practitioner
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"error": "Only practitioners can generate images"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate request data
        request_serializer = GenerateImageRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                request_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        user_prompt = request_serializer.validated_data['prompt']

        # Check rate limit
        can_generate, count_today = self.check_rate_limit(practitioner)
        if not can_generate:
            return Response(
                {
                    "error": f"Daily generation limit reached ({self.MAX_GENERATIONS_PER_DAY} images per day)",
                    "generations_today": count_today,
                    "limit": self.MAX_GENERATIONS_PER_DAY
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Generate image
        try:
            service = ImageGenerationService()
            image_bytes, mime_type, generation_time = service.generate_image(user_prompt)

            # Save to database and R2
            generated_image = service.save_generated_image(
                practitioner=practitioner,
                user_prompt=user_prompt,
                image_bytes=image_bytes,
                mime_type=mime_type,
                generation_time=generation_time
            )

            # Return success response
            response_data = {
                'id': generated_image.id,
                'image_url': generated_image.image_url,
                'user_prompt': generated_image.user_prompt,
                'generation_time_seconds': generated_image.generation_time_seconds,
                'message': 'Image generated successfully',
                'generations_remaining_today': self.MAX_GENERATIONS_PER_DAY - (count_today + 1)
            }

            return Response(
                response_data,
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to generate image: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        responses={200: GeneratedImageSerializer(many=True)},
        description="Get generation history for the authenticated practitioner"
    )
    @action(detail=False, methods=['get'], url_path='history')
    def generation_history(self, request):
        """
        Get all generated images for the authenticated practitioner.

        GET /api/v1/ai-images/history/
        """
        queryset = self.get_queryset().order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        responses={200: {'type': 'object'}},
        description="Get generation statistics for the authenticated practitioner"
    )
    @action(detail=False, methods=['get'], url_path='stats')
    def generation_stats(self, request):
        """
        Get generation statistics for the authenticated practitioner.

        GET /api/v1/ai-images/stats/
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"error": "Only practitioners can view stats"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Calculate stats
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        total_generated = GeneratedImage.objects.filter(practitioner=practitioner).count()
        generated_today = GeneratedImage.objects.filter(
            practitioner=practitioner,
            created_at__gte=today_start
        ).count()
        images_applied = GeneratedImage.objects.filter(
            practitioner=practitioner,
            is_applied=True
        ).count()

        return Response({
            'total_generated': total_generated,
            'generated_today': generated_today,
            'generations_remaining_today': max(0, self.MAX_GENERATIONS_PER_DAY - generated_today),
            'images_applied': images_applied,
            'daily_limit': self.MAX_GENERATIONS_PER_DAY
        })
