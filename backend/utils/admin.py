from django.contrib import admin
from .models import Country, Holiday, Modality, Language

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ['country', 'country_code', 'created_at']
    search_fields = ['country', 'country_code']

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['holiday', 'country', 'date']
    list_filter = ['country', 'date']
    search_fields = ['holiday', 'country__country']
    date_hierarchy = 'date'

@admin.register(Modality)
class ModalityAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']

@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'native_name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'native_name']