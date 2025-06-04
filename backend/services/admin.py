from django.contrib import admin
from .models import (
    Service, ServiceCategory, ServiceType, ServiceSession, 
    SessionAgendaItem, ServiceBenefit, ServicePractitioner, ServiceRelationship,
    Package, PackageService, Bundle
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
    list_display = ['name', 'primary_practitioner', 'service_type', 'price', 'duration_display', 
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
            'fields': ('price', 'duration_minutes', 'duration_display')
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
            'fields': ('location_type', 'location')
        }),
        ('Content & Learning', {
            'fields': ('what_youll_learn', 'prerequisites', 'includes')
        }),
        ('Media & Presentation', {
            'fields': ('image_url', 'video_url', 'tags')
        }),
        ('Multi-language', {
            'fields': ('languages',)
        }),
        ('Status & Visibility', {
            'fields': ('is_active', 'is_featured', 'is_public')
        }),
        ('Service Type Flags', {
            'fields': ('is_course',),
            'classes': ('collapse',)
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
            'primary_practitioner__user', 'service_type', 'category', 'location'
        )


class PackageServiceInline(admin.TabularInline):
    model = PackageService
    extra = 1
    fields = ['service', 'quantity', 'order', 'is_mandatory', 'notes']
    ordering = ['order']


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'practitioner', 'price', 'original_price', 'savings_percentage', 
                   'validity_days', 'is_active', 'is_featured']
    list_filter = ['category', 'practitioner', 'is_active', 'is_featured', 'is_transferable']
    search_fields = ['name', 'description', 'practitioner__user__email', 
                    'practitioner__display_name']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'savings_amount', 
                      'savings_percentage']
    inlines = [PackageServiceInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'id', 'public_uuid')
        }),
        ('Practitioner & Category', {
            'fields': ('practitioner', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'original_price', 'savings_amount', 'savings_percentage')
        }),
        ('Package Details', {
            'fields': ('validity_days', 'is_transferable', 'terms_conditions')
        }),
        ('Media & Metadata', {
            'fields': ('image_url', 'tags')
        }),
        ('Status', {
            'fields': ('is_active', 'is_featured')
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Bundle)
class BundleAdmin(admin.ModelAdmin):
    list_display = ['name', 'service', 'sessions_included', 'bonus_sessions', 'total_sessions', 
                   'price', 'price_per_session', 'savings_percentage', 'is_active']
    list_filter = ['service', 'is_active', 'is_featured', 'is_shareable']
    search_fields = ['name', 'description', 'service__name', 'service__primary_practitioner__user__email']
    readonly_fields = ['id', 'public_uuid', 'created_at', 'updated_at', 'total_sessions', 
                      'price_per_session', 'savings_amount', 'savings_percentage']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'service', 'id', 'public_uuid')
        }),
        ('Bundle Configuration', {
            'fields': ('sessions_included', 'bonus_sessions', 'total_sessions')
        }),
        ('Pricing', {
            'fields': ('price', 'price_per_session', 'savings_amount', 'savings_percentage')
        }),
        ('Validity & Restrictions', {
            'fields': ('validity_days', 'is_shareable', 'max_per_customer')
        }),
        ('Availability', {
            'fields': ('available_from', 'available_until')
        }),
        ('Display & Status', {
            'fields': ('highlight_text', 'is_active', 'is_featured')
        }),
        ('System Info', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('service__primary_practitioner__user')


