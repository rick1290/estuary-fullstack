from django.contrib import admin
from .models import GeneratedImage


@admin.register(GeneratedImage)
class GeneratedImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'practitioner', 'created_at', 'model_used', 'is_applied', 'service']
    list_filter = ['is_applied', 'model_used', 'created_at']
    search_fields = ['practitioner__user__email', 'user_prompt', 'full_prompt']
    readonly_fields = ['created_at', 'image_url']
    raw_id_fields = ['practitioner', 'service']

    fieldsets = (
        ('Generation Info', {
            'fields': ('practitioner', 'user_prompt', 'full_prompt', 'model_used', 'generation_time_seconds')
        }),
        ('Image', {
            'fields': ('image', 'image_url')
        }),
        ('Usage', {
            'fields': ('is_applied', 'service', 'applied_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
