from django.contrib import admin
from .models import (
    Service, ServiceCategory, ServiceType, ServiceSession, 
    SessionAgendaItem, ServiceBenefit, ServicePractitioner, ServiceRelationship
)

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'practitioner', 'service_type', 'price', 'duration_minutes', 'is_active']
    list_filter = ['service_type', 'is_active', 'is_package', 'is_bundle', 'is_course']
    search_fields = ['name', 'description', 'practitioner__user__email']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'order']
    search_fields = ['name']

@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['name']

@admin.register(ServiceSession)
class ServiceSessionAdmin(admin.ModelAdmin):
    list_display = ['service', 'name', 'date', 'start_time', 'max_participants', 'current_participants']
    list_filter = ['date', 'service__service_type']
    search_fields = ['name', 'service__name']
    date_hierarchy = 'date'