"""
Management command to test token refresh mechanism
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import requests
import time
import json

User = get_user_model()


class Command(BaseCommand):
    help = 'Test token refresh mechanism'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='test@example.com',
            help='Email of test user'
        )
        parser.add_argument(
            '--api-url',
            type=str,
            default='http://localhost:8000',
            help='API base URL'
        )

    def handle(self, *args, **options):
        email = options['email']
        api_url = options['api_url']
        
        # Get or create test user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True,
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created test user: {email}'))
        
        # Generate initial tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        self.stdout.write(f"\nInitial tokens generated:")
        self.stdout.write(f"Access token: {access_token[:20]}...")
        self.stdout.write(f"Refresh token: {refresh_token[:20]}...")
        
        # Test 1: Verify access token works
        self.stdout.write("\n" + "="*50)
        self.stdout.write("Test 1: Verify access token works")
        
        response = requests.get(
            f"{api_url}/api/v1/auth/me/",
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if response.status_code == 200:
            self.stdout.write(self.style.SUCCESS("✓ Access token valid"))
            self.stdout.write(f"User data: {json.dumps(response.json(), indent=2)}")
        else:
            self.stdout.write(self.style.ERROR(f"✗ Access token failed: {response.status_code}"))
            self.stdout.write(response.text)
        
        # Test 2: Refresh the token
        self.stdout.write("\n" + "="*50)
        self.stdout.write("Test 2: Refresh the token")
        
        refresh_response = requests.post(
            f"{api_url}/api/v1/auth/token/refresh/",
            json={'refresh': refresh_token}
        )
        
        if refresh_response.status_code == 200:
            self.stdout.write(self.style.SUCCESS("✓ Token refresh successful"))
            refresh_data = refresh_response.json()
            
            new_access_token = refresh_data.get('access')
            new_refresh_token = refresh_data.get('refresh')
            
            self.stdout.write(f"New access token: {new_access_token[:20] if new_access_token else 'None'}...")
            self.stdout.write(f"New refresh token: {new_refresh_token[:20] if new_refresh_token else 'None'}...")
            
            # Test 3: Verify new access token works
            if new_access_token:
                self.stdout.write("\n" + "="*50)
                self.stdout.write("Test 3: Verify new access token works")
                
                response = requests.get(
                    f"{api_url}/api/v1/auth/me/",
                    headers={'Authorization': f'Bearer {new_access_token}'}
                )
                
                if response.status_code == 200:
                    self.stdout.write(self.style.SUCCESS("✓ New access token valid"))
                else:
                    self.stdout.write(self.style.ERROR(f"✗ New access token failed: {response.status_code}"))
            
            # Test 4: Try to use old refresh token (should fail if rotation is enabled)
            if new_refresh_token:
                self.stdout.write("\n" + "="*50)
                self.stdout.write("Test 4: Try to use old refresh token (should fail)")
                
                old_refresh_response = requests.post(
                    f"{api_url}/api/v1/auth/token/refresh/",
                    json={'refresh': refresh_token}
                )
                
                if old_refresh_response.status_code != 200:
                    self.stdout.write(self.style.SUCCESS("✓ Old refresh token correctly rejected"))
                else:
                    self.stdout.write(self.style.WARNING("⚠ Old refresh token still works (rotation may be disabled)"))
                
                # Test 5: Use new refresh token
                self.stdout.write("\n" + "="*50)
                self.stdout.write("Test 5: Use new refresh token")
                
                new_refresh_response = requests.post(
                    f"{api_url}/api/v1/auth/token/refresh/",
                    json={'refresh': new_refresh_token}
                )
                
                if new_refresh_response.status_code == 200:
                    self.stdout.write(self.style.SUCCESS("✓ New refresh token works"))
                else:
                    self.stdout.write(self.style.ERROR(f"✗ New refresh token failed: {new_refresh_response.status_code}"))
        
        else:
            self.stdout.write(self.style.ERROR(f"✗ Token refresh failed: {refresh_response.status_code}"))
            self.stdout.write(refresh_response.text)
        
        self.stdout.write("\n" + "="*50)
        self.stdout.write("Token refresh testing complete")