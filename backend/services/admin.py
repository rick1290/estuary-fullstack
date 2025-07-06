from django.contrib import admin
from .models import (
    Service, ServiceCategory, ServiceType, ServiceSession, 
    SessionAgendaItem, ServiceBenefit, ServicePractitioner, ServiceRelationship,
    ServiceResource, ServiceResourceAccess, SessionParticipant, Waitlist
)

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['order', 'name']

@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category', 'is_active', 'order']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['order', 'name']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'primary_practitioner', 'service_type', 'get_price_display', 'duration_display', 
                   'location_type', 'is_active', 'is_featured']
    list_filter = ['service_type', 'category', 'location_type', 'experience_level', 
                   'is_active', 'is_featured', 'is_public']
    search_fields = ['name', 'description', 'primary_practitioner__user__email', 
                    'primary_practitioner__display_name']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'average_rating', 
                      'total_reviews', 'total_bookings', 'duration_display']
    filter_horizontal = ['languages']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'short_description', 'description', 'id', 'public_uuid')
        }),
        ('Pricing & Duration', {
            'fields': ('price_cents', 'duration_minutes', 'duration_display')
        }),
        ('Classification', {
            'fields': ('service_type', 'category', 'experience_level')
        }),
        ('Practitioners', {
            'fields': ('primary_practitioner',)
        }),
        ('Capacity & Targeting', {
            'fields': ('max_participants', 'min_participants', 'age_min', 'age_max')
        }),
        ('Location & Delivery', {
            'fields': ('location_type', 'address')
        }),
        ('Content & Learning', {
            'fields': ('what_youll_learn', 'prerequisites', 'includes')
        }),
        ('Media & Presentation', {
            'fields': ('image', 'tags')
        }),
        ('Multi-language', {
            'fields': ('languages',)
        }),
        ('Status & Visibility', {
            'fields': ('is_active', 'is_featured', 'is_public')
        }),
        ('Statistics (Read-only)', {
            'fields': ('average_rating', 'total_reviews', 'total_bookings'),
            'classes': ('collapse',)
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'primary_practitioner__user', 'service_type', 'category', 'address'
        )
    
    def get_price_display(self, obj):
        """Display price in dollars"""
        return f"${obj.price:.2f}"
    get_price_display.short_description = 'Price'
    get_price_display.admin_order_field = 'price_cents'


