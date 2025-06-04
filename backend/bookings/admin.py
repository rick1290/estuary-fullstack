from django.contrib import admin
from .models import Booking, BookingReminder, BookingNote

class BookingReminderInline(admin.TabularInline):
    model = BookingReminder
    extra = 0
    readonly_fields = ['is_sent', 'sent_at', 'send_attempts', 'last_attempt_at']


class BookingNoteInline(admin.TabularInline):
    model = BookingNote
    extra = 0
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['public_uuid_short', 'user_email', 'practitioner_name', 'service_name', 
                   'start_time', 'status', 'payment_status', 'final_amount', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['public_uuid', 'user__email', 'practitioner__user__email', 
                    'practitioner__display_name', 'service__name']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'duration_minutes',
                      'is_upcoming', 'is_active', 'can_be_canceled', 'can_be_rescheduled']
    date_hierarchy = 'start_time'
    
    fieldsets = (
        ('Booking Information', {
            'fields': ('id', 'public_uuid', 'title', 'description')
        }),
        ('Relationships', {
            'fields': ('user', 'practitioner', 'service', 'parent_booking', 'service_session')
        }),
        ('Scheduling', {
            'fields': ('start_time', 'end_time', 'actual_start_time', 'actual_end_time', 'timezone')
        }),
        ('Status & Payment', {
            'fields': ('status', 'payment_status', 'price_charged', 'discount_amount', 'final_amount')
        }),
        ('Location & Meeting', {
            'fields': ('location', 'meeting_url', 'meeting_id', 'room')
        }),
        ('Notes', {
            'fields': ('client_notes', 'practitioner_notes')
        }),
        ('Completion Tracking', {
            'fields': ('completed_at', 'no_show_at')
        }),
        ('Cancellation', {
            'fields': ('canceled_at', 'canceled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Rescheduling', {
            'fields': ('rescheduled_from',),
            'classes': ('collapse',)
        }),
        ('Properties (Read-only)', {
            'fields': ('duration_minutes', 'is_upcoming', 'is_active', 'can_be_canceled', 'can_be_rescheduled'),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [BookingReminderInline, BookingNoteInline]
    
    def public_uuid_short(self, obj):
        return str(obj.public_uuid)[:8] + '...'
    public_uuid_short.short_description = 'Public UUID'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Client Email'
    user_email.admin_order_field = 'user__email'
    
    def practitioner_name(self, obj):
        return str(obj.practitioner)
    practitioner_name.short_description = 'Practitioner'
    practitioner_name.admin_order_field = 'practitioner__display_name'
    
    def service_name(self, obj):
        return obj.service.name
    service_name.short_description = 'Service'
    service_name.admin_order_field = 'service__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'practitioner__user', 'service', 'location', 'room'
        )


@admin.register(BookingReminder)
class BookingReminderAdmin(admin.ModelAdmin):
    list_display = ['booking_info', 'reminder_type', 'scheduled_time', 'is_sent', 
                   'sent_at', 'send_attempts']
    list_filter = ['reminder_type', 'is_sent', 'scheduled_time']
    search_fields = ['booking__public_uuid', 'booking__user__email', 'subject']
    readonly_fields = ['id', 'created_at', 'updated_at', 'sent_at', 'last_attempt_at']
    date_hierarchy = 'scheduled_time'
    
    def booking_info(self, obj):
        return f"Booking {str(obj.booking.public_uuid)[:8]}... - {obj.booking.user.email}"
    booking_info.short_description = 'Booking'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('booking__user')


@admin.register(BookingNote)
class BookingNoteAdmin(admin.ModelAdmin):
    list_display = ['booking_info', 'author_email', 'content_preview', 'is_private', 'created_at']
    list_filter = ['is_private', 'created_at']
    search_fields = ['booking__public_uuid', 'booking__user__email', 'author__email', 'content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def booking_info(self, obj):
        return f"Booking {str(obj.booking.public_uuid)[:8]}... - {obj.booking.user.email}"
    booking_info.short_description = 'Booking'
    
    def author_email(self, obj):
        return obj.author.email
    author_email.short_description = 'Author'
    author_email.admin_order_field = 'author__email'
    
    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content Preview'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('booking__user', 'author')