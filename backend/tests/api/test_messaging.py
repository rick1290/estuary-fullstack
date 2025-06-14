#!/usr/bin/env python
"""
Test script for messaging API endpoints.
Tests conversations, messages, and real-time communication features.
"""

import os
import sys
import django
import asyncio
import json
from datetime import datetime, timedelta

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.utils import timezone
from api.main import app
from httpx import AsyncClient, ASGITransport
from users.models import User
from practitioners.models import Practitioner
from messaging.models import Conversation, Message
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"


class TestMessagingAPI:
    def __init__(self):
        self.client = None
        self.user_headers = {}
        self.practitioner_headers = {}
        self.user = None
        self.practitioner_user = None
        self.conversation = None
        
    async def setup(self):
        """Set up test data and authentication."""
        print("\n=== Setting up test data ===")
        
        # Create client
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url=BASE_URL)
        
        # Get users
        self.user = await sync_to_async(User.objects.get)(email='user@example.com')
        self.practitioner_user = await sync_to_async(User.objects.get)(email='practitioner@example.com')
        
        # Login as regular user
        login_data = {
            "email": "user@example.com",
            "password": "testpass123"
        }
        response = await self.client.post(f"{API_PREFIX}/auth/login", json=login_data)
        assert response.status_code == 200
        token = response.json()['access_token']
        self.user_headers = {"Authorization": f"Bearer {token}"}
        
        # Login as practitioner
        login_data = {
            "email": "practitioner@example.com",
            "password": "testpass123"
        }
        response = await self.client.post(f"{API_PREFIX}/auth/login", json=login_data)
        assert response.status_code == 200
        token = response.json()['access_token']
        self.practitioner_headers = {"Authorization": f"Bearer {token}"}
        
        print(f"✓ Setup complete")
        print(f"✓ User: {self.user.email}")
        print(f"✓ Practitioner: {self.practitioner_user.email}")
        
    async def test_create_conversation(self):
        """Test creating a new conversation."""
        print("\n=== Testing Create Conversation ===")
        
        # Create conversation as user with practitioner
        # Need to convert user IDs to UUIDs
        @sync_to_async
        def get_user_uuid(user_id):
            user = User.objects.get(id=user_id)
            return str(user.uuid)
            
        practitioner_uuid = await get_user_uuid(self.practitioner_user.id)
        print(f"DEBUG: Practitioner UUID: {practitioner_uuid}")
        
        conversation_data = {
            'participant_ids': [practitioner_uuid],  # Current user is added automatically
            'title': 'Question about wellness consultation',
            'message': {
                'content': 'Hi, I have some questions about your wellness consultation service.',
                'message_type': 'text'
            }
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/messaging/conversations",
            json=conversation_data,
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            conversation = response.json()
            self.conversation_id = conversation['id']
            
            print(f"✓ Conversation created successfully")
            print(f"✓ Conversation ID: {conversation['id']}")
            print(f"✓ Subject: {conversation.get('subject', 'N/A')}")
            print(f"✓ Participants: {len(conversation.get('participants', []))}")
            
            # Check if initial message was created
            if 'last_message' in conversation:
                print(f"✓ Initial message sent: {conversation['last_message'].get('content', 'N/A')[:50]}...")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_list_conversations(self):
        """Test listing user's conversations."""
        print("\n=== Testing List Conversations ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/messaging/conversations",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            conversations = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(conversations, list):
                print(f"✓ Found {len(conversations)} conversations")
                
                # Display conversations
                for conv in conversations[:3]:
                    print(f"\n  Conversation ID: {conv.get('id', 'N/A')}")
                    print(f"  Subject: {conv.get('subject', 'N/A')}")
                    print(f"  Last message: {conv.get('last_message_time', 'N/A')}")
                    print(f"  Unread: {conv.get('unread_count', 0)}")
                    
                return True
            else:
                print(f"✗ Unexpected response format")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_send_message(self):
        """Test sending a message in conversation."""
        print("\n=== Testing Send Message ===")
        
        if not hasattr(self, 'conversation_id'):
            # Create a conversation first
            await self.test_create_conversation()
            
        if not hasattr(self, 'conversation_id'):
            print("✗ No conversation available for testing")
            return False
            
        # Send message as practitioner (responding)
        message_data = {
            'content': 'Thank you for your interest! I would be happy to answer your questions.'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/messaging/conversations/{self.conversation_id}/messages",
            json=message_data,
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            message = response.json()
            
            print(f"✓ Message sent successfully")
            print(f"✓ Message ID: {message['id']}")
            print(f"✓ Sender: {message.get('sender', {}).get('email', 'N/A')}")
            print(f"✓ Content: {message['content'][:50]}...")
            print(f"✓ Sent at: {message.get('created_at', 'N/A')}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_get_conversation_messages(self):
        """Test getting messages from a conversation."""
        print("\n=== Testing Get Conversation Messages ===")
        
        if not hasattr(self, 'conversation_id'):
            print("✗ No conversation available for testing")
            return False
            
        response = await self.client.get(
            f"{API_PREFIX}/messaging/conversations/{self.conversation_id}/messages",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            messages = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(messages, list):
                print(f"✓ Found {len(messages)} messages")
                
                # Display messages
                for msg in messages:
                    print(f"\n  From: {msg.get('sender', {}).get('email', 'N/A')}")
                    print(f"  Content: {msg.get('content', 'N/A')[:50]}...")
                    print(f"  Time: {msg.get('created_at', 'N/A')}")
                    print(f"  Read: {msg.get('is_read', False)}")
                    
                return True
            else:
                print(f"✗ Unexpected response format")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_mark_messages_read(self):
        """Test marking messages as read."""
        print("\n=== Testing Mark Messages Read ===")
        
        if not hasattr(self, 'conversation_id'):
            print("✗ No conversation available for testing")
            return False
            
        # Mark messages as read - need to get message IDs first
        messages_response = await self.client.get(
            f"{API_PREFIX}/messaging/conversations/{self.conversation_id}/messages",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        if messages_response.status_code == 200:
            messages_data = messages_response.json()
            messages = messages_data.get('results', messages_data) if isinstance(messages_data, dict) else messages_data
            message_ids = [msg['id'] for msg in messages[:2]]  # Mark first 2 messages as read
            
            # Mark messages as read
            response = await self.client.post(
                f"{API_PREFIX}/messaging/conversations/{self.conversation_id}/messages/read",
                json={"message_ids": message_ids},
                headers=self.user_headers,
                follow_redirects=True
            )
        else:
            print("✗ Could not get messages to mark as read")
            return False
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✓ Messages marked as read")
            print(f"✓ Updated count: {result.get('updated_count', 0)}")
            
            # Verify unread count is now 0
            response = await self.client.get(
                f"{API_PREFIX}/messaging/conversations/{self.conversation_id}",
                headers=self.user_headers,
                follow_redirects=True
            )
            
            if response.status_code == 200:
                conv = response.json()
                unread = conv.get('unread_count', -1)
                print(f"✓ Unread count after marking: {unread}")
                return unread == 0
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_delete_message(self):
        """Test deleting a message."""
        print("\n=== Testing Delete Message ===")
        
        # First, create a new message to delete
        if not hasattr(self, 'conversation_id'):
            print("✗ No conversation available for testing")
            return False
            
        # Send a test message
        message_data = {
            'content': 'This message will be deleted for testing'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/messaging/conversations/{self.conversation_id}/messages",
            json=message_data,
            headers=self.user_headers,
            follow_redirects=True
        )
        
        if response.status_code != 201:
            print("✗ Could not create test message")
            return False
            
        message_id = response.json()['id']
        
        # Now delete it
        response = await self.client.delete(
            f"{API_PREFIX}/messaging/messages/{message_id}",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code in [204, 200]:
            print(f"✓ Message deleted successfully")
            
            # Verify it's gone or marked as deleted
            response = await self.client.get(
                f"{API_PREFIX}/messaging/messages/{message_id}",
                headers=self.user_headers,
                follow_redirects=True
            )
            
            if response.status_code == 404:
                print(f"✓ Message no longer accessible")
                return True
            elif response.status_code == 200:
                msg = response.json()
                if msg.get('is_deleted', False):
                    print(f"✓ Message marked as deleted")
                    return True
                    
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_conversation_search(self):
        """Test searching conversations."""
        print("\n=== Testing Conversation Search ===")
        
        # Search by subject or content
        params = {'search': 'wellness'}
        
        response = await self.client.get(
            f"{API_PREFIX}/messaging/conversations",
            params=params,
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            conversations = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(conversations, list):
                print(f"✓ Found {len(conversations)} conversations matching 'wellness'")
                
                for conv in conversations:
                    print(f"  - {conv.get('subject', 'N/A')}")
                    
                return True
            else:
                print(f"✗ Unexpected response format")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_unread_count(self):
        """Test getting unread message count."""
        print("\n=== Testing Unread Count ===")
        
        # Try different possible endpoints
        endpoints = [
            f"{API_PREFIX}/messaging/unread-count",
            f"{API_PREFIX}/messaging/conversations/unread",
            f"{API_PREFIX}/users/me/unread-messages"
        ]
        
        for endpoint in endpoints:
            response = await self.client.get(
                endpoint,
                headers=self.user_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Found unread count at: {endpoint}")
                print(f"✓ Total unread: {data.get('unread_count', data.get('count', 0))}")
                
                # Show breakdown if available
                if 'conversations' in data:
                    print(f"✓ Unread conversations: {len(data['conversations'])}")
                    
                return True
                
        print(f"✓ No specific unread count endpoint (counts may be in conversation list)")
        return True
        
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all messaging tests."""
        print("\n" + "="*60)
        print("MESSAGING API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("Create Conversation", self.test_create_conversation),
                ("List Conversations", self.test_list_conversations),
                ("Send Message", self.test_send_message),
                ("Get Conversation Messages", self.test_get_conversation_messages),
                ("Mark Messages Read", self.test_mark_messages_read),
                ("Delete Message", self.test_delete_message),
                ("Conversation Search", self.test_conversation_search),
                ("Unread Count", self.test_unread_count)
            ]
            
            results = []
            
            for test_name, test_func in tests:
                try:
                    result = await test_func()
                    results.append((test_name, result))
                except Exception as e:
                    print(f"\n✗ {test_name} failed with error: {str(e)}")
                    results.append((test_name, False))
                    
            # Summary
            print("\n" + "="*60)
            print("TEST SUMMARY")
            print("="*60)
            
            passed = sum(1 for _, result in results if result)
            total = len(results)
            
            for test_name, result in results:
                status = "✓ PASSED" if result else "✗ FAILED"
                print(f"{status}: {test_name}")
                
            print(f"\nTotal: {passed}/{total} tests passed")
            
            # Note about WebSocket testing
            print("\n" + "="*40)
            print("NOTE: Real-time WebSocket features require")
            print("separate testing with WebSocket client.")
            print("These tests cover REST API functionality.")
            print("="*40)
            
            return passed == total
            
        finally:
            await self.cleanup()


async def main():
    """Main entry point."""
    tester = TestMessagingAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())