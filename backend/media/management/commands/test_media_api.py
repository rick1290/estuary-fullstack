"""
Test Media API endpoints
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate
from media.api.v1.views import MediaViewSet
from media.models import MediaEntityType
import tempfile
import os
from PIL import Image
from io import BytesIO

User = get_user_model()


class Command(BaseCommand):
    help = 'Test media API endpoints'

    def handle(self, *args, **options):
        # Get or create test user
        user, created = User.objects.get_or_create(
            email='media_test@example.com',
            defaults={
                'username': 'media_test',
                'first_name': 'Media',
                'last_name': 'Test',
                'is_active': True
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created test user: {user.email}'))
        
        # Create API request factory
        factory = APIRequestFactory()
        
        # Test 1: List media (empty initially)
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Test 1: List Media')
        self.stdout.write('='*50)
        
        view = MediaViewSet.as_view({'get': 'list'})
        request = factory.get('/api/v1/drf/media/')
        force_authenticate(request, user=user)
        response = view(request)
        
        self.stdout.write(f'Status: {response.status_code}')
        self.stdout.write(f'Results: {response.data}')
        
        # Test 2: Generate presigned upload URL
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Test 2: Generate Presigned Upload URL')
        self.stdout.write('='*50)
        
        view = MediaViewSet.as_view({'post': 'presigned_upload'})
        data = {
            'filename': 'test_image.jpg',
            'content_type': 'image/jpeg',
            'entity_type': MediaEntityType.USER,
            'entity_id': str(user.id),
            'file_size': 1024000  # 1MB
        }
        request = factory.post('/api/v1/drf/media/presigned_upload/', data, format='json')
        force_authenticate(request, user=user)
        response = view(request)
        
        self.stdout.write(f'Status: {response.status_code}')
        if response.status_code == 200:
            self.stdout.write(f'Upload URL: {response.data.get("upload_url", "")[:100]}...')
            self.stdout.write(f'Media ID: {response.data.get("media_id")}')
            self.stdout.write(f'Expires at: {response.data.get("expires_at")}')
            media_id = response.data.get("media_id")
        else:
            self.stdout.write(f'Error: {response.data}')
            media_id = None
        
        # Test 3: Create a test image and upload directly
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Test 3: Direct File Upload')
        self.stdout.write('='*50)
        
        # Create a test image
        image = Image.new('RGB', (100, 100), color='red')
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG')
        img_buffer.seek(0)
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
            tmp_file.write(img_buffer.getvalue())
            tmp_file.flush()
            
            # Create upload request
            view = MediaViewSet.as_view({'post': 'upload'})
            with open(tmp_file.name, 'rb') as file:
                data = {
                    'file': file,
                    'entity_type': MediaEntityType.USER,
                    'entity_id': str(user.id),
                    'title': 'Test Image',
                    'description': 'A test image uploaded via API',
                    'alt_text': 'Red square test image'
                }
                request = factory.post('/api/v1/drf/media/upload/', data, format='multipart')
                force_authenticate(request, user=user)
                response = view(request)
            
            # Clean up temp file
            os.unlink(tmp_file.name)
        
        self.stdout.write(f'Status: {response.status_code}')
        if response.status_code in [200, 201]:
            self.stdout.write(f'Media ID: {response.data.get("id")}')
            self.stdout.write(f'URL: {response.data.get("url")}')
            self.stdout.write(f'Status: {response.data.get("status")}')
            uploaded_media_id = response.data.get("id")
        else:
            self.stdout.write(f'Error: {response.data}')
            uploaded_media_id = None
        
        # Test 4: Get media details
        if uploaded_media_id:
            self.stdout.write('\n' + '='*50)
            self.stdout.write('Test 4: Get Media Details')
            self.stdout.write('='*50)
            
            view = MediaViewSet.as_view({'get': 'retrieve'})
            request = factory.get(f'/api/v1/drf/media/{uploaded_media_id}/')
            force_authenticate(request, user=user)
            response = view(request, pk=uploaded_media_id)
            
            self.stdout.write(f'Status: {response.status_code}')
            if response.status_code == 200:
                self.stdout.write(f'Filename: {response.data.get("filename")}')
                self.stdout.write(f'File size: {response.data.get("file_size")} bytes')
                self.stdout.write(f'Media type: {response.data.get("media_type")}')
                self.stdout.write(f'View count: {response.data.get("view_count")}')
            else:
                self.stdout.write(f'Error: {response.data}')
        
        # Test 5: Update media metadata
        if uploaded_media_id:
            self.stdout.write('\n' + '='*50)
            self.stdout.write('Test 5: Update Media Metadata')
            self.stdout.write('='*50)
            
            view = MediaViewSet.as_view({'patch': 'partial_update'})
            data = {
                'title': 'Updated Test Image',
                'description': 'This description has been updated',
                'display_order': 1
            }
            request = factory.patch(f'/api/v1/drf/media/{uploaded_media_id}/', data, format='json')
            force_authenticate(request, user=user)
            response = view(request, pk=uploaded_media_id)
            
            self.stdout.write(f'Status: {response.status_code}')
            if response.status_code == 200:
                self.stdout.write(f'Updated title: {response.data.get("title")}')
                self.stdout.write(f'Updated description: {response.data.get("description")}')
            else:
                self.stdout.write(f'Error: {response.data}')
        
        # Test 6: Set as primary
        if uploaded_media_id:
            self.stdout.write('\n' + '='*50)
            self.stdout.write('Test 6: Set Media as Primary')
            self.stdout.write('='*50)
            
            view = MediaViewSet.as_view({'post': 'set_primary'})
            request = factory.post(f'/api/v1/drf/media/{uploaded_media_id}/set_primary/')
            force_authenticate(request, user=user)
            response = view(request, pk=uploaded_media_id)
            
            self.stdout.write(f'Status: {response.status_code}')
            if response.status_code == 200:
                self.stdout.write(f'Is primary: {response.data.get("is_primary")}')
            else:
                self.stdout.write(f'Error: {response.data}')
        
        # Test 7: Bulk operations
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Test 7: Bulk Update')
        self.stdout.write('='*50)
        
        if uploaded_media_id:
            view = MediaViewSet.as_view({'post': 'bulk_update'})
            data = {
                'media_ids': [str(uploaded_media_id)],
                'updates': {
                    'alt_text': 'Bulk updated alt text'
                }
            }
            request = factory.post('/api/v1/drf/media/bulk_update/', data, format='json')
            force_authenticate(request, user=user)
            response = view(request)
            
            self.stdout.write(f'Status: {response.status_code}')
            if response.status_code == 200:
                self.stdout.write(f'Updated count: {response.data.get("updated")}')
            else:
                self.stdout.write(f'Error: {response.data}')
        
        # Test 8: List media with filters
        self.stdout.write('\n' + '='*50)
        self.stdout.write('Test 8: List Media with Filters')
        self.stdout.write('='*50)
        
        view = MediaViewSet.as_view({'get': 'list'})
        request = factory.get('/api/v1/drf/media/', {
            'entity_type': MediaEntityType.USER,
            'entity_id': str(user.id),
            'media_type': 'image'
        })
        force_authenticate(request, user=user)
        response = view(request)
        
        self.stdout.write(f'Status: {response.status_code}')
        self.stdout.write(f'Total results: {len(response.data.get("results", []))}')
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('All tests completed!'))
        self.stdout.write('='*50)