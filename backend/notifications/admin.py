from django.contrib import admin
from django.utils.html import format_html
from .models import Notification, NotificationTemplate, NotificationSetting


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'notification_type', 'delivery_channel', 
        'is_read', 'status', 'created_at'
    ]
    list_filter = [
        'notification_type', 'delivery_channel', 'is_read', 
        'status', 'created_at'
    ]
    search_fields = ['title', 'message', 'user__email', 'user__username']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'sent_at',
        'display_metadata'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'message', 'notification_type')
        }),
        ('Delivery', {
            'fields': ('delivery_channel', 'status', 'is_read', 'scheduled_for', 'sent_at')
        }),
        ('Related Object', {
            'fields': ('related_object_type', 'related_object_id'),
            'classes': ('collapse',)
        }),
        ('Additional Data', {
            'fields': ('metadata', 'display_metadata'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_metadata(self, obj):
        """Display metadata as formatted JSON."""
        import json
        if obj.metadata:
            formatted = json.dumps(obj.metadata, indent=2)
            return format_html('<pre>{}</pre>', formatted)
        return '-'
    display_metadata.short_description = 'Metadata (Formatted)'
    
    actions = ['mark_as_read', 'mark_as_unread', 'mark_as_sent']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notifications marked as unread.')
    mark_as_unread.short_description = 'Mark selected notifications as unread'
    
    def mark_as_sent(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='sent', sent_at=timezone.now())
        self.message_user(request, f'{updated} notifications marked as sent.')
    mark_as_sent.short_description = 'Mark selected notifications as sent'


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'notification_type', 'delivery_channel', 
        'is_active', 'created_at'
    ]
    list_filter = ['notification_type', 'delivery_channel', 'is_active']
    search_fields = ['name', 'subject_template', 'body_template']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'notification_type', 'delivery_channel', 'is_active')
        }),
        ('Template Content', {
            'fields': ('subject_template', 'body_template'),
            'description': 'Use Django template syntax for variables, e.g., {{ user_name }}'
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['body_template'].widget.attrs['rows'] = 10
        return form


@admin.register(NotificationSetting)
class NotificationSettingAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'notification_type', 'email_enabled', 
        'sms_enabled', 'in_app_enabled', 'push_enabled'
    ]
    list_filter = [
        'notification_type', 'email_enabled', 'sms_enabled', 
        'in_app_enabled', 'push_enabled'
    ]
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User & Type', {
            'fields': ('user', 'notification_type')
        }),
        ('Channel Preferences', {
            'fields': ('email_enabled', 'sms_enabled', 'in_app_enabled', 'push_enabled'),
            'description': 'Enable or disable notification channels for this type'
        }),
        ('System Fields', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user')