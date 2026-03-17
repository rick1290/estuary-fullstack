from django.contrib import admin
from journal.models import JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'entry_type', 'service', 'created_at']
    list_filter = ['entry_type', 'created_at']
    search_fields = ['content', 'user__email']
    readonly_fields = ['public_uuid', 'created_at', 'updated_at']
