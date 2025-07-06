#!/usr/bin/env python
"""
Test script to verify image upload functionality for services
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from services.models import Service
from django.core.files.base import ContentFile
from django.conf import settings

def test_image_upload():
    print("=== Testing Image Upload Configuration ===")
    print(f"DEBUG: {settings.DEBUG}")
    print(f"MEDIA_URL: {settings.MEDIA_URL}")
    print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
    print(f"DEFAULT_FILE_STORAGE: {settings.DEFAULT_FILE_STORAGE}")
    
    if hasattr(settings, 'CLOUDFLARE_R2_ACCESS_KEY_ID'):
        print(f"R2 Access Key ID: {'*' * 10}{settings.CLOUDFLARE_R2_ACCESS_KEY_ID[-4:]}")
        print(f"R2 Bucket: {settings.CLOUDFLARE_R2_STORAGE_BUCKET_NAME}")
        print(f"R2 Endpoint: {settings.CLOUDFLARE_R2_ENDPOINT_URL}")
    
    # Get a test service
    try:
        service = Service.objects.first()
        if service:
            print(f"\nTesting with service: {service.name} (ID: {service.id})")
            
            # Create a test image
            test_content = b"Test image content"
            test_file = ContentFile(test_content, name="test_image.jpg")
            
            # Save the image
            service.image.save("test_image.jpg", test_file, save=True)
            
            print(f"Image saved!")
            print(f"Image field: {service.image}")
            print(f"Image name: {service.image.name}")
            print(f"Image URL: {service.image.url}")
            print(f"Image path exists: {service.image.storage.exists(service.image.name)}")
            
            # Check custom property
            if hasattr(service, 'image_url'):
                print(f"Custom image_url property: {service.image_url}")
            
            # Clean up
            service.image.delete(save=True)
            print("\nTest image deleted.")
        else:
            print("No services found in database.")
    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_image_upload()