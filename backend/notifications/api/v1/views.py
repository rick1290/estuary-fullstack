from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.notifications.models import Notification, NotificationTemplate, NotificationSetting
from apps.notifications.api.v1.serializers import (
    NotificationSerializer, NotificationCreateSerializer,
    NotificationTemplateSerializer, NotificationSettingSerializer,
    NotificationBulkUpdateSerializer, NotificationSettingBulkUpdateSerializer
)
from apps.utils.permissions import IsOwnerOrReadOnly


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'delivery_channel', 'is_read', 'status']
    ordering_fields = ['created_at', 'scheduled_for', 'sent_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return notifications for the current user.
        """
        user = self.request.user
        return Notification.objects.filter(user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return NotificationCreateSerializer
        elif self.action == 'bulk_update':
            return NotificationBulkUpdateSerializer
        return NotificationSerializer
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Mark a notification as read.
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Bulk update notifications (e.g., mark multiple as read).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        is_read = serializer.validated_data.get('is_read')
        status_value = serializer.validated_data.get('status')
        
        # Get notifications for the current user with the specified IDs
        notifications = Notification.objects.filter(
            id__in=notification_ids,
            user=request.user
        )
        
        # Update notifications
        update_fields = {}
        if is_read is not None:
            update_fields['is_read'] = is_read
        if status_value is not None:
            update_fields['status'] = status_value
        
        if update_fields:
            notifications.update(**update_fields)
        
        return Response({'status': 'notifications updated'})
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """
        Get unread notifications.
        """
        notifications = self.get_queryset().filter(is_read=False)
        
        # Apply filters
        for backend in list(self.filter_backends):
            notifications = backend().filter_queryset(self.request, notifications, self)
        
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Mark all notifications as read.
        """
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification templates.
    Only admin users can access this endpoint.
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'delivery_channel', 'is_active']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']


class NotificationSettingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification settings.
    """
    serializer_class = NotificationSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['notification_type']
    
    def get_queryset(self):
        """
        Return notification settings for the current user.
        """
        user = self.request.user
        return NotificationSetting.objects.filter(user=user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Bulk update notification settings.
        """
        serializer = NotificationSettingBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        settings = serializer.validated_data['settings']
        
        for setting_data in settings:
            notification_type = setting_data.pop('notification_type')
            
            # Update or create the setting
            setting, created = NotificationSetting.objects.update_or_create(
                user=request.user,
                notification_type=notification_type,
                defaults=setting_data
            )
        
        # Return updated settings
        updated_settings = self.get_queryset()
        result_serializer = NotificationSettingSerializer(updated_settings, many=True)
        return Response(result_serializer.data)
    
    @action(detail=False, methods=['get'])
    def defaults(self, request):
        """
        Get default notification settings for all notification types.
        """
        # Get all notification types
        notification_types = [choice[0] for choice in Notification.NOTIFICATION_TYPES]
        
        # Get existing settings for the user
        existing_settings = {
            setting.notification_type: setting
            for setting in self.get_queryset()
        }
        
        # Create settings for any missing notification types
        results = []
        for notification_type in notification_types:
            if notification_type in existing_settings:
                # Use existing setting
                results.append(existing_settings[notification_type])
            else:
                # Create a new setting with defaults
                setting = NotificationSetting(
                    user=request.user,
                    notification_type=notification_type,
                    email_enabled=True,
                    sms_enabled=True,
                    in_app_enabled=True,
                    push_enabled=True
                )
                setting.save()
                results.append(setting)
        
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)
