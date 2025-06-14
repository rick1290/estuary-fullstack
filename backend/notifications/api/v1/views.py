from django.db.models import Count, Q, F, Case, When, IntegerField
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from notifications.models import Notification, NotificationTemplate, NotificationSetting
from .serializers import (
    NotificationSerializer, NotificationListSerializer,
    NotificationMarkReadSerializer, NotificationTemplateSerializer,
    NotificationSettingSerializer, BulkNotificationPreferenceSerializer,
    NotificationStatsSerializer, NotificationGroupSerializer
)
from .permissions import (
    IsNotificationOwner, IsNotificationSettingOwner, 
    CanManageNotificationTemplates
)
from .filters import NotificationFilter, NotificationSettingFilter


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notifications.
    
    Provides endpoints for:
    - Listing notifications (with filtering)
    - Marking notifications as read/unread
    - Deleting notifications
    - Getting notification statistics
    - Grouping notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated, IsNotificationOwner]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = NotificationFilter
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']
    search_fields = ['title', 'message']
    
    def get_queryset(self):
        """Return notifications for the current user only."""
        return Notification.objects.filter(
            user=self.request.user,
            delivery_channel='in_app'
        ).select_related('user')
    
    def get_serializer_class(self):
        """Use lightweight serializer for list views."""
        if self.action == 'list':
            return NotificationListSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark notifications as read/unread."""
        serializer = NotificationMarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data.get('notification_ids')
        is_read = serializer.validated_data.get('is_read', True)
        
        queryset = self.get_queryset()
        if notification_ids:
            queryset = queryset.filter(id__in=notification_ids)
        
        updated_count = queryset.update(is_read=is_read)
        
        return Response({
            'message': f'Successfully marked {updated_count} notifications as {"read" if is_read else "unread"}',
            'updated_count': updated_count
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """Mark a single notification as unread."""
        notification = self.get_object()
        notification.is_read = False
        notification.save()
        return Response({'message': 'Notification marked as unread'})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get notification statistics for the user."""
        queryset = self.get_queryset()
        
        # Calculate stats
        stats = {
            'unread_count': queryset.filter(is_read=False).count(),
            'total_count': queryset.count(),
            'by_type': {}
        }
        
        # Count by type
        type_counts = queryset.values('notification_type').annotate(
            count=Count('id'),
            unread_count=Count(Case(When(is_read=False, then=1)))
        )
        
        for item in type_counts:
            stats['by_type'][item['notification_type']] = {
                'total': item['count'],
                'unread': item['unread_count']
            }
        
        # Get recent notifications
        recent_notifications = queryset[:5]
        stats['recent_notifications'] = NotificationListSerializer(
            recent_notifications, many=True
        ).data
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def grouped(self, request):
        """
        Get notifications grouped by type and date.
        Useful for notification centers with grouped display.
        """
        queryset = self.get_queryset()
        
        # Group by notification type
        groups = []
        
        # Today's notifications
        today = timezone.now().date()
        today_notifications = queryset.filter(
            created_at__date=today
        ).order_by('-created_at')
        
        if today_notifications.exists():
            groups.append({
                'group_key': 'today',
                'group_type': 'date',
                'count': today_notifications.count(),
                'latest_notification': NotificationListSerializer(
                    today_notifications.first()
                ).data,
                'notifications': NotificationListSerializer(
                    today_notifications[:10], many=True
                ).data
            })
        
        # Yesterday's notifications
        yesterday = today - timezone.timedelta(days=1)
        yesterday_notifications = queryset.filter(
            created_at__date=yesterday
        ).order_by('-created_at')
        
        if yesterday_notifications.exists():
            groups.append({
                'group_key': 'yesterday',
                'group_type': 'date',
                'count': yesterday_notifications.count(),
                'latest_notification': NotificationListSerializer(
                    yesterday_notifications.first()
                ).data,
                'notifications': NotificationListSerializer(
                    yesterday_notifications[:10], many=True
                ).data
            })
        
        # Older notifications grouped by type
        older_notifications = queryset.filter(
            created_at__date__lt=yesterday
        ).values('notification_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        for group in older_notifications:
            type_notifications = queryset.filter(
                created_at__date__lt=yesterday,
                notification_type=group['notification_type']
            ).order_by('-created_at')[:10]
            
            if type_notifications:
                groups.append({
                    'group_key': group['notification_type'],
                    'group_type': 'notification_type',
                    'count': group['count'],
                    'latest_notification': NotificationListSerializer(
                        type_notifications.first()
                    ).data,
                    'notifications': NotificationListSerializer(
                        type_notifications, many=True
                    ).data
                })
        
        return Response(groups)
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """Delete multiple notifications."""
        notification_ids = request.data.get('notification_ids', [])
        
        if not notification_ids:
            return Response(
                {'error': 'notification_ids field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count = self.get_queryset().filter(
            id__in=notification_ids
        ).delete()[0]
        
        return Response({
            'message': f'Successfully deleted {deleted_count} notifications',
            'deleted_count': deleted_count
        })


class NotificationSettingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notification preferences.
    
    Users can enable/disable notification channels for each notification type.
    """
    serializer_class = NotificationSettingSerializer
    permission_classes = [IsAuthenticated, IsNotificationSettingOwner]
    filter_backends = [DjangoFilterBackend]
    filterset_class = NotificationSettingFilter
    
    def get_queryset(self):
        """Return notification settings for the current user only."""
        return NotificationSetting.objects.filter(
            user=self.request.user
        ).order_by('notification_type')
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update notification preferences."""
        serializer = BulkNotificationPreferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        preferences = serializer.validated_data['preferences']
        updated_settings = []
        
        for pref in preferences:
            setting, created = NotificationSetting.objects.get_or_create(
                user=request.user,
                notification_type=pref['notification_type'],
                defaults={
                    'email_enabled': pref.get('email_enabled', True),
                    'sms_enabled': pref.get('sms_enabled', True),
                    'in_app_enabled': pref.get('in_app_enabled', True),
                    'push_enabled': pref.get('push_enabled', True),
                }
            )
            
            if not created:
                # Update existing setting
                for field in ['email_enabled', 'sms_enabled', 'in_app_enabled', 'push_enabled']:
                    if field in pref:
                        setattr(setting, field, pref[field])
                setting.save()
            
            updated_settings.append(setting)
        
        return Response(
            NotificationSettingSerializer(updated_settings, many=True).data
        )
    
    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset all notification preferences to defaults."""
        # Delete all existing settings for the user
        self.get_queryset().delete()
        
        # Create default settings for all notification types
        default_settings = []
        for notification_type, _ in Notification.NOTIFICATION_TYPES:
            setting = NotificationSetting.objects.create(
                user=request.user,
                notification_type=notification_type,
                email_enabled=True,
                sms_enabled=True,
                in_app_enabled=True,
                push_enabled=True
            )
            default_settings.append(setting)
        
        return Response(
            NotificationSettingSerializer(default_settings, many=True).data
        )


class NotificationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing notification templates.
    Read-only access for regular users.
    """
    serializer_class = NotificationTemplateSerializer
    permission_classes = [CanManageNotificationTemplates]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['notification_type', 'delivery_channel', 'is_active']
    
    def get_queryset(self):
        """Return only active templates."""
        return NotificationTemplate.objects.filter(is_active=True)