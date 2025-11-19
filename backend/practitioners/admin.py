from django.contrib import admin
from .models import (
    Practitioner, Topic, Specialize, Style, Certification, Education,
    OutOfOffice, Question, SchedulePreference, ServiceSchedule,
    ScheduleAvailability, Schedule, ScheduleTimeSlot, FeatureRequest
)

@admin.register(Practitioner)
class PractitionerAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'display_name', 'professional_title', 'is_verified', 
                   'practitioner_status', 'featured', 'created_at']
    list_filter = ['is_verified', 'practitioner_status', 'featured', 'is_onboarded', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 
                    'display_name', 'professional_title']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'average_rating', 
                      'total_reviews', 'total_services', 'completed_sessions_count', 'cancellation_rate']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'id', 'public_uuid')
        }),
        ('Professional Details', {
            'fields': ('display_name', 'professional_title', 'bio', 'quote')
        }),
        ('Media', {
            'fields': ('profile_image', 'profile_video_url')
        }),
        ('Verification & Status', {
            'fields': ('is_verified', 'practitioner_status', 'featured')
        }),
        ('Experience', {
            'fields': ('years_of_experience', 'primary_location')
        }),
        ('Business Settings', {
            'fields': ('buffer_time', 'next_available_date')
        }),
        ('Onboarding', {
            'fields': ('is_onboarded', 'onboarding_step', 'onboarding_completed_at'),
            'classes': ('collapse',)
        }),
        ('Statistics (Read-only)', {
            'fields': ('average_rating', 'total_reviews', 'total_services', 
                      'completed_sessions_count', 'cancellation_rate'),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['id', 'content']
    search_fields = ['content']

@admin.register(Specialize)
class SpecializeAdmin(admin.ModelAdmin):
    list_display = ['id', 'content']
    search_fields = ['content']

@admin.register(Style)
class StyleAdmin(admin.ModelAdmin):
    list_display = ['id', 'content']
    search_fields = ['content']

@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ['certificate', 'institution', 'issue_date', 'expiry_date', 'order']
    list_filter = ['institution', 'issue_date']
    search_fields = ['certificate', 'institution']

@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ['degree', 'educational_institute', 'order']
    list_filter = ['degree']
    search_fields = ['degree', 'educational_institute']

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['practitioner', 'name', 'timezone', 'is_active']
    list_filter = ['timezone', 'is_active']

@admin.register(FeatureRequest)
class FeatureRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'practitioner_display', 'category', 'priority', 'status', 'votes', 'created_at']
    list_filter = ['status', 'category', 'priority', 'created_at']
    search_fields = ['title', 'description', 'practitioner__display_name', 'practitioner__user__email']
    readonly_fields = ['created_at', 'updated_at', 'votes']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Request Details', {
            'fields': ('practitioner', 'title', 'description')
        }),
        ('Classification', {
            'fields': ('category', 'priority', 'status')
        }),
        ('Engagement', {
            'fields': ('votes',)
        }),
        ('Admin Notes', {
            'fields': ('admin_notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def practitioner_display(self, obj):
        """Display practitioner name or email"""
        return obj.practitioner.display_name or obj.practitioner.user.email
    practitioner_display.short_description = 'Practitioner'
