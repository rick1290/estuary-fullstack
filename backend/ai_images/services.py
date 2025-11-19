import os
import time
import mimetypes
from io import BytesIO
from django.core.files.base import ContentFile
from google import genai
from google.genai import types


class ImageGenerationService:
    """Service for generating images using Gemini AI with brand guidelines"""

    ESTUARY_BRAND_PROMPT = """
You are creating wellness and health-focused imagery for Estuary, a transformative wellness marketplace.

BRAND GUIDELINES:
- Style: Natural, calming, serene, and professional
- Colors: Earthy tones (sage green, terracotta, warm neutrals, soft creams)
- Mood: Peaceful, grounded, transformative, authentic
- Focus: Wellness, mindfulness, healing, personal growth, nature
- Aesthetic: Minimalist, organic, warm, inviting

STRICT REQUIREMENTS:
- NO TEXT OR WORDS in the image whatsoever
- NO logos, labels, or typography
- NO overly clinical or medical imagery
- NO stock photo feel - should feel authentic and artisanal
- Avoid clichés (lotus poses, chakras overlays, crystal grids)
- High quality, professional photography style

GOOD EXAMPLES:
- Soft natural lighting on meditation space
- Close-up of hands in gentle healing gesture
- Serene natural landscape with warm tones
- Abstract organic shapes with earthy colors
- Peaceful wellness environment with natural elements

CREATE: {user_prompt}

Remember: Absolutely no text, words, or typography in the image. Pure visual imagery only.
"""

    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.5-flash-image"

    def build_full_prompt(self, user_prompt: str) -> str:
        """Combine user prompt with brand guidelines"""
        return self.ESTUARY_BRAND_PROMPT.format(user_prompt=user_prompt)

    def generate_image(self, user_prompt: str) -> tuple[bytes, str, float]:
        """
        Generate an image from a user prompt.

        Args:
            user_prompt: The practitioner's image description

        Returns:
            tuple: (image_bytes, mime_type, generation_time_seconds)

        Raises:
            ValueError: If generation fails
        """
        start_time = time.time()

        full_prompt = self.build_full_prompt(user_prompt)

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=full_prompt),
                ],
            ),
        ]

        generate_content_config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )

        # Collect image data from stream
        image_data = None
        mime_type = None

        try:
            for chunk in self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=generate_content_config,
            ):
                if (
                    chunk.candidates is None
                    or chunk.candidates[0].content is None
                    or chunk.candidates[0].content.parts is None
                ):
                    continue

                # Check for inline image data
                if (
                    chunk.candidates[0].content.parts[0].inline_data
                    and chunk.candidates[0].content.parts[0].inline_data.data
                ):
                    inline_data = chunk.candidates[0].content.parts[0].inline_data
                    image_data = inline_data.data
                    mime_type = inline_data.mime_type
                    break  # Got the image, stop processing

            if not image_data:
                raise ValueError("No image data received from Gemini API")

            generation_time = time.time() - start_time

            return image_data, mime_type, generation_time

        except Exception as e:
            raise ValueError(f"Failed to generate image: {str(e)}")

    def save_generated_image(
        self,
        practitioner,
        user_prompt: str,
        image_bytes: bytes,
        mime_type: str,
        generation_time: float
    ):
        """
        Save generated image to GeneratedImage model.

        Args:
            practitioner: Practitioner instance
            user_prompt: Original user prompt
            image_bytes: Image data
            mime_type: MIME type of image
            generation_time: Time taken to generate

        Returns:
            GeneratedImage instance
        """
        from .models import GeneratedImage

        # Generate filename
        file_extension = mimetypes.guess_extension(mime_type) or '.png'
        filename = f"generated_{int(time.time())}{file_extension}"

        # Create ContentFile from bytes
        image_file = ContentFile(image_bytes, name=filename)

        # Create database record
        generated_image = GeneratedImage.objects.create(
            practitioner=practitioner,
            user_prompt=user_prompt,
            full_prompt=self.build_full_prompt(user_prompt),
            model_used=self.model,
            generation_time_seconds=round(generation_time, 2)
        )

        # Save image to ImageField (will auto-upload to R2)
        generated_image.image.save(filename, image_file, save=True)

        return generated_image
