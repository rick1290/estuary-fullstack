from django.contrib import admin
from .models import Modality, ModalityCategory


@admin.register(ModalityCategory)
class ModalityCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'color', 'order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['order', 'name']


@admin.register(Modality)
class ModalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_ref', 'cluster', 'gray_zone', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'category_ref', 'gray_zone', 'cluster']
    search_fields = ['name', 'short_description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['order', 'name']
    autocomplete_fields = ['category_ref']
    filter_horizontal = ['related_modalities']
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'icon', 'category_ref', 'category', 'cluster', 'order', 'is_active', 'is_featured', 'gray_zone')
        }),
        ('Content', {
            'fields': ('description', 'short_description', 'long_description', 'benefits', 'faqs')
        }),
        ('SEO', {
            'fields': ('seo_meta_title', 'seo_meta_description', 'seo_primary_keyword', 'seo_secondary_keywords'),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('related_modalities',)
        }),
        ('Meta', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
