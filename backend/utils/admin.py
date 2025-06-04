from django.contrib import admin
from .models import Country, Holiday, Language

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'created_at']
    search_fields = ['name', 'code']

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'country', 'date']
    list_filter = ['country', 'date']
    search_fields = ['name', 'country__name']
    date_hierarchy = 'date'

@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'native_name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'native_name']