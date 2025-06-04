from django.contrib import admin
from .models import Modality


@admin.register(Modality)
class ModalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'category']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['order', 'name']