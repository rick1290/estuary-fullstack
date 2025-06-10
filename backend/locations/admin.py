from django.contrib import admin
from .models import State, City, ZipCode, PractitionerLocation


# @admin.register(State)
# class StateAdmin(admin.ModelAdmin):
#     list_display = ('name', 'abbreviation', 'slug')
#     search_fields = ('name', 'abbreviation')
#     prepopulated_fields = {'slug': ('name',)}


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'population', 'is_major', 'latitude', 'longitude')
    list_filter = ('state', 'is_major')
    search_fields = ('name', 'state__name')
    prepopulated_fields = {'slug': ('name',)}
    list_select_related = ('state',)


@admin.register(ZipCode)
class ZipCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'city', 'latitude', 'longitude')
    list_filter = ('city__state',)
    search_fields = ('code', 'city__name')
    list_select_related = ('city', 'city__state')


# @admin.register(PractitionerLocation)
# class PractitionerLocationAdmin(admin.ModelAdmin):
#     list_display = ('practitioner', 'address_line1', 'city', 'state', 'zip_code', 'is_primary', 'is_virtual', 'is_in_person')
#     list_filter = ('is_primary', 'is_virtual', 'is_in_person', 'state')
#     search_fields = ('practitioner__user__first_name', 'practitioner__user__last_name', 'address_line1', 'city__name', 'zip_code')
#     list_select_related = ('practitioner', 'city', 'state')
#     raw_id_fields = ('practitioner',)
