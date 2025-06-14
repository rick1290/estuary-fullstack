#!/usr/bin/env python
"""
Test script for streams API endpoints.
Tests content creation platform with posts, media, subscriptions, and monetization.
"""

import os
import sys
import django
import asyncio
import json
from datetime import datetime, timedelta, date
from decimal import Decimal

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.utils import timezone
from api.main import app
from httpx import AsyncClient, ASGITransport
from users.models import User
from practitioners.models import Practitioner
from streams.models import Stream, StreamCategory, StreamPost, StreamSubscription
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"


class TestStreamsAPI:
    def __init__(self):
        self.client = None
        self.user_headers = {}
        self.practitioner_headers = {}
        self.user = None
        self.practitioner_user = None
        self.practitioner = None
        self.stream = None
        self.stream_id = None
        self.post_id = None
        self.subscription_id = None
        
    async def setup(self):
        """Set up test data and authentication."""
        print("\n=== Setting up test data ===")
        
        # Create client
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url=BASE_URL)
        
        # Get users
        self.user = await sync_to_async(User.objects.get)(email='user@example.com')
        self.practitioner_user = await sync_to_async(User.objects.get)(email='practitioner@example.com')
        self.practitioner = await sync_to_async(Practitioner.objects.get)(user=self.practitioner_user)
        
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
        
        # Create test categories
        await self.create_test_categories()
        
        print(f"✓ Setup complete")
        print(f"✓ User: {self.user.email}")
        print(f"✓ Practitioner: {self.practitioner_user.email}")
        
    async def create_test_categories(self):
        """Create test stream categories"""
        @sync_to_async
        def create_categories():
            categories = [
                {"name": "Wellness", "slug": "wellness", "description": "Health and wellness content"},
                {"name": "Meditation", "slug": "meditation", "description": "Meditation and mindfulness"},
                {"name": "Yoga", "slug": "yoga", "description": "Yoga instruction and practice"},
                {"name": "Nutrition", "slug": "nutrition", "description": "Nutrition and diet guidance"}
            ]
            
            created_categories = []
            for cat_data in categories:
                category, created = StreamCategory.objects.get_or_create(
                    slug=cat_data['slug'],
                    defaults=cat_data
                )
                created_categories.append(category)
            return created_categories
        
        self.categories = await create_categories()
        print(f"✓ Created {len(self.categories)} test categories")
        
    async def test_list_categories(self):
        """Test listing stream categories."""
        print("\n=== Testing List Categories ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/streams/categories",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            categories = response.json()
            
            print(f"✓ Found {len(categories)} categories")
            
            for cat in categories[:3]:
                print(f"  - {cat.get('name', 'N/A')} ({cat.get('slug', 'N/A')})")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_create_stream(self):
        """Test creating a new stream."""
        print("\n=== Testing Create Stream ===")
        
        # Get category IDs
        category_ids = [cat.id for cat in self.categories[:2]]
        
        stream_data = {
            'title': 'Mindful Wellness Journey',
            'tagline': 'Transform your life through mindful practices',
            'description': 'Join me on a journey of wellness, mindfulness, and personal transformation.',
            'about': 'I am a certified wellness coach with over 10 years of experience...',
            'free_tier_name': 'Explorer',
            'entry_tier_name': 'Supporter',
            'premium_tier_name': 'VIP Member',
            'entry_tier_price': 9.99,
            'premium_tier_price': 29.99,
            'free_tier_description': 'Access to free content and community',
            'entry_tier_description': 'Weekly wellness tips and guided meditations',
            'premium_tier_description': 'Exclusive content, 1-on-1 sessions, and personalized plans',
            'free_tier_perks': ['Community access', 'Free weekly tips'],
            'entry_tier_perks': ['All free content', 'Weekly guided meditations', 'Monthly Q&A'],
            'premium_tier_perks': ['All entry content', 'Weekly 1-on-1 sessions', 'Personalized plans', 'Priority support'],
            'category_ids': category_ids,
            'tags': ['wellness', 'meditation', 'mindfulness', 'health'],
            'allow_comments': True,
            'allow_dms': False,
            'allow_tips': True,
            'preview_post_count': 3,
            'watermark_media': True
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/streams/",
            json=stream_data,
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            stream = response.json()
            self.stream_id = stream['id']
            
            print(f"✓ Stream created successfully")
            print(f"✓ Stream ID: {stream['id']}")
            print(f"✓ Title: {stream.get('title', 'N/A')}")
            print(f"✓ Practitioner: {stream.get('practitioner_name', 'N/A')}")
            print(f"✓ Categories: {len(stream.get('categories', []))}")
            print(f"✓ Tier prices: Entry=${stream.get('tiers', [{}])[1].get('price_display', 'N/A')}, Premium=${stream.get('tiers', [{}])[2].get('price_display', 'N/A')}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_get_stream(self):
        """Test getting stream details."""
        print("\n=== Testing Get Stream ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        response = await self.client.get(
            f"{API_PREFIX}/streams/{self.stream_id}",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            stream = response.json()
            
            print(f"✓ Stream retrieved successfully")
            print(f"✓ Title: {stream.get('title', 'N/A')}")
            print(f"✓ Subscriber count: {stream.get('subscriber_count', 0)}")
            print(f"✓ Post count: {stream.get('post_count', 0)}")
            print(f"✓ Is launched: {stream.get('is_launched', False)}")
            print(f"✓ Tiers available: {len(stream.get('tiers', []))}")
            
            # Check tier structure
            tiers = stream.get('tiers', [])
            for tier in tiers:
                print(f"  - {tier.get('name', 'N/A')}: {tier.get('price_display', 'N/A')}")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_launch_stream(self):
        """Test launching a stream."""
        print("\n=== Testing Launch Stream ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        response = await self.client.post(
            f"{API_PREFIX}/streams/{self.stream_id}/launch",
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✓ Stream launched successfully")
            print(f"✓ Message: {result.get('message', 'N/A')}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_discover_streams(self):
        """Test discovering streams."""
        print("\n=== Testing Discover Streams ===")
        
        # Test basic discovery
        response = await self.client.get(
            f"{API_PREFIX}/streams/discover",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            streams = data.get('results', [])
            
            print(f"✓ Found {len(streams)} streams")
            print(f"✓ Total: {data.get('total', 0)}")
            
            # Test with filters
            params = {
                'tags': ['wellness'],
                'sort_by': 'subscriber_count',
                'sort_order': 'desc'
            }
            
            response = await self.client.get(
                f"{API_PREFIX}/streams/discover",
                params=params,
                headers=self.user_headers,
                follow_redirects=True
            )
            
            if response.status_code == 200:
                filtered_data = response.json()
                filtered_streams = filtered_data.get('results', [])
                print(f"✓ Filtered by wellness tag: {len(filtered_streams)} streams")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_create_stream_post(self):
        """Test creating stream posts."""
        print("\n=== Testing Create Stream Post ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        # Test free post
        free_post_data = {
            'title': 'Welcome to My Wellness Journey',
            'content': 'Hello everyone! Welcome to my wellness stream. This is a free post available to all followers.',
            'post_type': 'post',
            'tier_level': 'free',
            'allow_comments': True,
            'allow_tips': True,
            'tags': ['welcome', 'free', 'introduction']
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/streams/{self.stream_id}/posts",
            json=free_post_data,
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Free post status: {response.status_code}")
        
        if response.status_code == 201:
            post = response.json()
            self.post_id = post['id']
            
            print(f"✓ Free post created successfully")
            print(f"✓ Post ID: {post['id']}")
            print(f"✓ Title: {post.get('title', 'N/A')}")
            print(f"✓ Tier level: {post.get('tier_level', 'N/A')}")
            print(f"✓ Has access: {post.get('has_access', False)}")
            
        # Test premium post
        premium_post_data = {
            'title': 'Exclusive Meditation Guide',
            'content': 'This is an exclusive 30-minute guided meditation session for premium members only.',
            'post_type': 'post',
            'tier_level': 'premium',
            'teaser_text': 'Unlock this exclusive meditation guide with a premium subscription!',
            'blur_preview': True,
            'allow_comments': True,
            'allow_tips': True,
            'tags': ['meditation', 'premium', 'exclusive']
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/streams/{self.stream_id}/posts",
            json=premium_post_data,
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Premium post status: {response.status_code}")
        
        if response.status_code == 201:
            post = response.json()
            
            print(f"✓ Premium post created successfully")
            print(f"✓ Post ID: {post['id']}")
            print(f"✓ Title: {post.get('title', 'N/A')}")
            print(f"✓ Tier level: {post.get('tier_level', 'N/A')}")
            print(f"✓ Teaser text: {post.get('teaser_text', 'N/A')}")
            
            return True
        else:
            print(f"✗ Premium post error: {response.json()}")
            return False
            
    async def test_list_stream_posts(self):
        """Test listing stream posts."""
        print("\n=== Testing List Stream Posts ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        # Test as non-subscriber
        response = await self.client.get(
            f"{API_PREFIX}/streams/{self.stream_id}/posts",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Non-subscriber status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            posts = data.get('results', [])
            
            print(f"✓ Found {len(posts)} posts as non-subscriber")
            
            for post in posts:
                print(f"  - {post.get('title', 'N/A')} ({post.get('tier_level', 'N/A')}) - Access: {post.get('has_access', False)}")
                if not post.get('has_access', False) and post.get('teaser_text'):
                    print(f"    Teaser: {post.get('teaser_text', 'N/A')[:50]}...")
                    
            # Test with filters
            params = {
                'tier_level': 'free',
                'sort_by': 'published_at',
                'sort_order': 'desc'
            }
            
            response = await self.client.get(
                f"{API_PREFIX}/streams/{self.stream_id}/posts",
                params=params,
                headers=self.user_headers,
                follow_redirects=True
            )
            
            if response.status_code == 200:
                filtered_data = response.json()
                filtered_posts = filtered_data.get('results', [])
                print(f"✓ Filtered to free posts: {len(filtered_posts)} posts")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_get_stream_post(self):
        """Test getting individual stream post."""
        print("\n=== Testing Get Stream Post ===")
        
        if not self.post_id:
            print("✗ No post available for testing")
            return False
            
        response = await self.client.get(
            f"{API_PREFIX}/streams/posts/{self.post_id}",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            post = response.json()
            
            print(f"✓ Post retrieved successfully")
            print(f"✓ Title: {post.get('title', 'N/A')}")
            print(f"✓ View count: {post.get('view_count', 0)}")
            print(f"✓ Like count: {post.get('like_count', 0)}")
            print(f"✓ Comment count: {post.get('comment_count', 0)}")
            print(f"✓ Has access: {post.get('has_access', False)}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_subscribe_to_stream(self):
        """Test subscribing to a stream."""
        print("\n=== Testing Subscribe to Stream ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        # Test free subscription first
        subscription_data = {
            'tier': 'free',
            'payment_method_id': 'fake_payment_method_for_free'  # Not used for free tier
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/streams/{self.stream_id}/subscribe",
            json=subscription_data,
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Free subscription status: {response.status_code}")
        
        if response.status_code == 201:
            subscription = response.json()
            self.subscription_id = subscription['id']
            
            print(f"✓ Free subscription created successfully")
            print(f"✓ Subscription ID: {subscription['id']}")
            print(f"✓ Tier: {subscription.get('tier', 'N/A')}")
            print(f"✓ Status: {subscription.get('status', 'N/A')}")
            print(f"✓ Started at: {subscription.get('started_at', 'N/A')}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_list_my_subscriptions(self):
        """Test listing user's subscriptions."""
        print("\n=== Testing List My Subscriptions ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/streams/my-subscriptions",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            subscriptions = data.get('results', [])
            
            print(f"✓ Found {len(subscriptions)} subscriptions")
            
            for sub in subscriptions:
                print(f"  - {sub.get('stream_title', 'N/A')} ({sub.get('tier', 'N/A')}) - Status: {sub.get('status', 'N/A')}")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_post_interactions(self):
        """Test post interactions like likes and comments."""
        print("\n=== Testing Post Interactions ===")
        
        if not self.post_id:
            print("✗ No post available for testing")
            return False
            
        # Test liking a post
        response = await self.client.post(
            f"{API_PREFIX}/streams/posts/{self.post_id}/like",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Like post status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Post interaction: {result.get('message', 'N/A')}")
            
        # Test commenting on a post
        comment_data = {
            'content': 'This is a great post! Thank you for sharing this valuable content.'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/streams/posts/{self.post_id}/comments",
            json=comment_data,
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"Comment status: {response.status_code}")
        
        if response.status_code == 201:
            comment = response.json()
            
            print(f"✓ Comment created successfully")
            print(f"✓ Comment ID: {comment['id']}")
            print(f"✓ User: {comment.get('user_name', 'N/A')}")
            print(f"✓ Content: {comment.get('content', 'N/A')[:50]}...")
            
        # Test listing comments
        response = await self.client.get(
            f"{API_PREFIX}/streams/posts/{self.post_id}/comments",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"List comments status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            comments = data.get('results', [])
            
            print(f"✓ Found {len(comments)} comments")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_stream_analytics(self):
        """Test stream analytics."""
        print("\n=== Testing Stream Analytics ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        # Test analytics (only stream owner can access)
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/streams/{self.stream_id}/analytics",
            params=params,
            headers=self.practitioner_headers,
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            analytics = response.json()
            
            print(f"✓ Analytics retrieved successfully")
            print(f"✓ Date range: {analytics.get('start_date', 'N/A')} to {analytics.get('end_date', 'N/A')}")
            print(f"✓ Total subscribers: {analytics.get('total_subscribers', 0)}")
            print(f"✓ New subscribers: {analytics.get('new_subscribers', 0)}")
            print(f"✓ Posts published: {analytics.get('posts_published', 0)}")
            print(f"✓ Total views: {analytics.get('total_views', 0)}")
            print(f"✓ Total revenue: ${analytics.get('total_revenue', 0)}")
            print(f"✓ Daily stats entries: {len(analytics.get('daily_stats', []))}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_stream_content_access(self):
        """Test content access based on subscription tiers."""
        print("\n=== Testing Stream Content Access ===")
        
        if not self.stream_id:
            print("✗ No stream available for testing")
            return False
            
        # Test access after subscription
        response = await self.client.get(
            f"{API_PREFIX}/streams/{self.stream_id}/posts",
            headers=self.user_headers,
            follow_redirects=True
        )
        
        print(f"After subscription status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            posts = data.get('results', [])
            
            print(f"✓ Posts accessible after free subscription:")
            
            free_access_count = 0
            premium_blocked_count = 0
            
            for post in posts:
                tier = post.get('tier_level', 'N/A')
                has_access = post.get('has_access', False)
                title = post.get('title', 'N/A')
                
                print(f"  - {title} ({tier}) - Access: {has_access}")
                
                if tier == 'free' and has_access:
                    free_access_count += 1
                elif tier in ['entry', 'premium'] and not has_access:
                    premium_blocked_count += 1
                    
            print(f"✓ Free content accessible: {free_access_count}")
            print(f"✓ Premium content blocked: {premium_blocked_count}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all streams tests."""
        print("\n" + "="*60)
        print("STREAMS API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("List Categories", self.test_list_categories),
                ("Create Stream", self.test_create_stream),
                ("Get Stream", self.test_get_stream),
                ("Launch Stream", self.test_launch_stream),
                ("Discover Streams", self.test_discover_streams),
                ("Create Stream Posts", self.test_create_stream_post),
                ("List Stream Posts", self.test_list_stream_posts),
                ("Get Stream Post", self.test_get_stream_post),
                ("Subscribe to Stream", self.test_subscribe_to_stream),
                ("List My Subscriptions", self.test_list_my_subscriptions),
                ("Post Interactions", self.test_post_interactions),
                ("Stream Content Access", self.test_stream_content_access),
                ("Stream Analytics", self.test_stream_analytics)
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
            
            # Note about monetization features
            print("\n" + "="*40)
            print("NOTE: Full monetization features (Stripe integration,")
            print("paid subscriptions, tips) require payment processing")
            print("setup and would need real Stripe test keys.")
            print("This test suite covers the content creation platform")
            print("structure and basic subscription management.")
            print("="*40)
            
            return passed == total
            
        finally:
            await self.cleanup()


async def main():
    """Main entry point."""
    tester = TestStreamsAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())