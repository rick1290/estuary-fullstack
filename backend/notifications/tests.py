from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Notification, NotificationSetting, NotificationTemplate

User = get_user_model()


class NotificationAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create some test notifications
        self.notification1 = Notification.objects.create(
            user=self.user,
            title='Test Notification 1',
            message='This is a test notification',
            notification_type='system',
            delivery_channel='in_app'
        )
        
        self.notification2 = Notification.objects.create(
            user=self.user,
            title='Test Notification 2',
            message='This is another test notification',
            notification_type='booking',
            delivery_channel='in_app',
            is_read=True
        )
    
    def test_list_notifications(self):
        """Test listing user notifications."""
        response = self.client.get('/api/v1/drf/notifications/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_filter_notifications_by_type(self):
        """Test filtering notifications by type."""
        response = self.client.get('/api/v1/drf/notifications/notifications/?notification_type=booking')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['notification_type'], 'booking')
    
    def test_filter_unread_notifications(self):
        """Test filtering unread notifications."""
        response = self.client.get('/api/v1/drf/notifications/notifications/?is_read=false')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertFalse(response.data['results'][0]['is_read'])
    
    def test_mark_notification_as_read(self):
        """Test marking a notification as read."""
        response = self.client.post(
            f'/api/v1/drf/notifications/notifications/{self.notification1.id}/mark_as_read/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.notification1.refresh_from_db()
        self.assertTrue(self.notification1.is_read)
    
    def test_mark_multiple_notifications_as_read(self):
        """Test marking multiple notifications as read."""
        # Create another unread notification
        notification3 = Notification.objects.create(
            user=self.user,
            title='Test Notification 3',
            message='Third test notification',
            notification_type='payment',
            delivery_channel='in_app'
        )
        
        response = self.client.post(
            '/api/v1/drf/notifications/notifications/mark_read/',
            {
                'notification_ids': [self.notification1.id, notification3.id],
                'is_read': True
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated_count'], 2)
        
        self.notification1.refresh_from_db()
        notification3.refresh_from_db()
        self.assertTrue(self.notification1.is_read)
        self.assertTrue(notification3.is_read)
    
    def test_get_unread_count(self):
        """Test getting unread notification count."""
        response = self.client.get('/api/v1/drf/notifications/notifications/unread_count/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
    
    def test_notification_settings(self):
        """Test notification settings CRUD."""
        # Create a setting
        response = self.client.post(
            '/api/v1/drf/notifications/notification-settings/',
            {
                'notification_type': 'booking',
                'email_enabled': True,
                'sms_enabled': False,
                'in_app_enabled': True,
                'push_enabled': True
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # List settings
        response = self.client.get('/api/v1/drf/notifications/notification-settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_bulk_update_notification_preferences(self):
        """Test bulk updating notification preferences."""
        response = self.client.post(
            '/api/v1/drf/notifications/notification-settings/bulk_update/',
            {
                'preferences': [
                    {
                        'notification_type': 'booking',
                        'email_enabled': False,
                        'in_app_enabled': True
                    },
                    {
                        'notification_type': 'payment',
                        'email_enabled': True,
                        'sms_enabled': False
                    }
                ]
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_notification_permissions(self):
        """Test that users can only see their own notifications."""
        # Create another user and notification
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        Notification.objects.create(
            user=other_user,
            title='Other User Notification',
            message='This belongs to another user',
            notification_type='system',
            delivery_channel='in_app'
        )
        
        # List notifications should only show current user's notifications
        response = self.client.get('/api/v1/drf/notifications/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # All notifications should belong to the authenticated user
        for notif in response.data['results']:
            self.assertEqual(notif['user'], self.user.id)