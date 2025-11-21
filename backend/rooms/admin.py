from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from rooms.models import (
    Room, RoomTemplate, RoomParticipant, RoomToken, RoomRecording,
    VideoToken, RoomBookingRelation
)


@admin.register(RoomTemplate)
class RoomTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'room_type', 'max_participants', 'recording_enabled', 
                   'sip_enabled', 'is_default', 'is_active']
    list_filter = ['room_type', 'is_active', 'is_default', 'recording_enabled', 'sip_enabled']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'room_type', 'is_default', 'is_active')
        }),
        ('Room Settings', {
            'fields': ('empty_timeout', 'max_participants')
        }),
        ('Media Settings', {
            'fields': ('video_codec', 'audio_codec')
        }),
        ('Recording Settings', {
            'fields': ('recording_enabled', 'recording_audio_only', 'recording_output_format')
        }),
        ('Streaming Settings', {
            'fields': ('streaming_enabled', 'rtmp_outputs')
        }),
        ('SIP/PSTN Settings', {
            'fields': ('sip_enabled', 'sip_trunk_id', 'sip_dispatch_rule_id')
        }),
        ('Advanced', {
            'fields': ('webhook_url', 'default_permissions'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'room_type', 'status', 'current_participants', 
                   'max_participants', 'recording_status', 'sip_enabled', 
                   'created_at', 'room_link']
    list_filter = ['room_type', 'status', 'recording_status', 'sip_enabled', 
                  'created_at']
    search_fields = ['name', 'livekit_room_name', 'livekit_room_sid', 'public_uuid']
    readonly_fields = ['public_uuid', 'livekit_room_sid', 'created_at', 'updated_at',
                      'actual_start', 'actual_end', 'total_duration_seconds',
                      'peak_participants', 'total_participants', 'dial_in_pin']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'public_uuid', 'room_type', 'status', 'template')
        }),
        ('LiveKit Details', {
            'fields': ('livekit_room_name', 'livekit_room_sid')
        }),
        ('Relationships', {
            'fields': ('booking', 'service_session')
        }),
        ('Room Settings', {
            'fields': ('empty_timeout', 'max_participants')
        }),
        ('Recording', {
            'fields': ('recording_enabled', 'recording_status', 'recording_id')
        }),
        ('SIP/Dial-in', {
            'fields': ('sip_enabled', 'dial_in_number', 'dial_in_pin')
        }),
        ('Timing', {
            'fields': ('scheduled_start', 'scheduled_end', 'actual_start', 
                      'actual_end', 'total_duration_seconds')
        }),
        ('Participants', {
            'fields': ('current_participants', 'peak_participants', 'total_participants')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def room_link(self, obj):
        if obj.livekit_room_name:
            url = obj.get_join_url()
            return format_html('<a href="{}" target="_blank">Join Room</a>', url)
        return '-'
    room_link.short_description = 'Room Link'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('service_session', 'template')


@admin.register(RoomParticipant)
class RoomParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'role', 'joined_at', 'left_at', 
                   'duration_seconds', 'is_dial_in', 'connection_quality']
    list_filter = ['role', 'is_presenter', 'is_dial_in', 'joined_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 
                    'identity', 'participant_sid']
    readonly_fields = ['participant_sid', 'joined_at', 'duration_seconds']
    date_hierarchy = 'joined_at'
    
    fieldsets = (
        ('Participant Info', {
            'fields': ('room', 'user', 'identity', 'participant_sid', 'role')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
        ('Timing', {
            'fields': ('joined_at', 'left_at', 'duration_seconds')
        }),
        ('Connection', {
            'fields': ('connection_quality', 'ip_address', 'user_agent')
        }),
        ('Flags', {
            'fields': ('is_presenter', 'is_recording_participant', 'is_dial_in')
        }),
        ('Analytics', {
            'fields': ('messages_sent', 'video_enabled_duration', 
                      'audio_enabled_duration', 'screen_share_duration'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('room', 'user')


@admin.register(RoomToken)
class RoomTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'role', 'expires_at', 'is_used', 
                   'is_revoked', 'created_at']
    list_filter = ['role', 'is_used', 'is_revoked', 'created_at', 'expires_at']
    search_fields = ['user__email', 'identity', 'token']
    readonly_fields = ['token', 'created_at', 'used_at', 'revoked_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Token Info', {
            'fields': ('room', 'user', 'participant', 'token', 'identity', 'role')
        }),
        ('Status', {
            'fields': ('expires_at', 'is_used', 'used_at', 'is_revoked', 'revoked_at')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
        ('Usage', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('room', 'user', 'participant')


@admin.register(RoomRecording)
class RoomRecordingAdmin(admin.ModelAdmin):
    list_display = ['room', 'status', 'started_at', 'duration_formatted', 
                   'file_size_mb', 'file_format', 'is_processed', 'recording_link']
    list_filter = ['status', 'file_format', 'is_processed', 'is_public', 
                  'storage_provider', 'started_at']
    search_fields = ['room__name', 'recording_id', 'egress_id']
    readonly_fields = ['recording_id', 'egress_id', 'started_at', 'ended_at', 
                      'duration_seconds', 'duration_formatted', 'file_size_bytes',
                      'processed_at']
    date_hierarchy = 'started_at'
    
    fieldsets = (
        ('Recording Info', {
            'fields': ('room', 'recording_id', 'egress_id', 'status')
        }),
        ('Timing', {
            'fields': ('started_at', 'ended_at', 'duration_seconds', 'duration_formatted')
        }),
        ('File Details', {
            'fields': ('file_url', 'file_size_bytes', 'file_format', 'thumbnail_url')
        }),
        ('Storage', {
            'fields': ('storage_provider', 'storage_bucket', 'storage_key')
        }),
        ('Processing', {
            'fields': ('is_processed', 'processed_at')
        }),
        ('Access Control', {
            'fields': ('is_public', 'access_expires_at')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    def file_size_mb(self, obj):
        if obj.file_size_bytes:
            return f"{obj.file_size_bytes / (1024 * 1024):.2f} MB"
        return '-'
    file_size_mb.short_description = 'File Size'
    
    def recording_link(self, obj):
        if obj.file_url:
            return format_html('<a href="{}" target="_blank">Download</a>', obj.file_url)
        return '-'
    recording_link.short_description = 'Recording'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('room')


# Legacy model admins
@admin.register(VideoToken)
class VideoTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'role', 'booking', 'expires_at', 
                   'is_used', 'is_revoked']
    list_filter = ['role', 'is_used', 'is_revoked']
    search_fields = ['user__email', 'token']
    readonly_fields = ['token']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'room', 'booking')


@admin.register(RoomBookingRelation)
class RoomBookingRelationAdmin(admin.ModelAdmin):
    list_display = ['room', 'booking', 'created_at']
    search_fields = ['room__name', 'booking__id']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('room', 'booking')