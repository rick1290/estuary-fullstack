from django.contrib import admin
from .models import (
    Practitioner, Topic, Specialize, Style, Certification, Education, 
    OutOfOffice, Question, SchedulePreference, ServiceSchedule, 
    ScheduleAvailability, Schedule, ScheduleTimeSlot
)

@admin.register(Practitioner)
class PractitionerAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'is_verified', 'practitioner_status', 'created_at']
    list_filter = ['is_verified', 'practitioner_status', 'featured']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'title', 'display_name']

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
