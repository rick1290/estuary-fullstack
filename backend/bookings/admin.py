from django.contrib import admin
from .models import Booking, BookingReminders

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'practitioner', 'service', 'start_time', 'status', 'created_at']
    list_filter = ['status', 'is_canceled', 'is_group', 'created_at']
    search_fields = ['user__email', 'practitioner__user__email', 'service__name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_time'

@admin.register(BookingReminders)
class BookingRemindersAdmin(admin.ModelAdmin):
    list_display = ['booking', 'type', 'scheduled_time', 'sent_at']
    list_filter = ['type', 'sent_at']
    date_hierarchy = 'scheduled_time'