#!/usr/bin/env python
"""
Test script to send a welcome email using Courier.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.contrib.auth import get_user_model
from notifications.services.registry import get_client_notification_service

User = get_user_model()

def test_welcome_email():
    """Test sending a welcome email."""
    print("Testing Courier welcome email...")
    
    try:
        # Create a new test user with unique email
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        email = f'test_courier_{unique_id}@example.com'
        
        print(f"Creating new test user: {email}")
        user = User.objects.create_user(
            email=email,
            password='testpass123',
            first_name='Test',
            last_name='Courier'
        )
        
        print(f"Using user: {user.email}")
        
        # Get the client notification service
        service = get_client_notification_service()
        
        # Send welcome email with verification token
        verification_token = "test_token_123"
        result = service.send_welcome_email(user, verification_token)
        
        print(f"✓ Welcome email sent successfully!")
        print(f"Result: {result}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error sending welcome email: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_welcome_email()
    if success:
        print("\n🎉 Test completed successfully!")
        print("Check your email and the Courier dashboard for delivery status.")
    else:
        print("\n❌ Test failed. Check the error messages above.")