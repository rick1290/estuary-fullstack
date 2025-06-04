"""
Base admin classes for all apps to use with standard Django admin.
"""
from django.contrib import admin


class BaseModelAdmin(admin.ModelAdmin):
    """
    Base ModelAdmin class for all admin interfaces.
    Inherits from Django's ModelAdmin for consistent styling.
    """
    list_per_page = 25
    save_on_top = True
    
    class Media:
        css = {
            "all": ["css/admin/custom.css"],
        }


class BaseTabularInline(admin.TabularInline):
    """
    Base TabularInline class for all admin interfaces.
    Inherits from Django's TabularInline for consistent styling.
    """
    extra = 0


class BaseStackedInline(admin.StackedInline):
    """
    Base StackedInline class for all admin interfaces.
    Inherits from Django's StackedInline for consistent styling.
    """
    extra = 0
