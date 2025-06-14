from django.contrib import admin
from django.utils.html import format_html
from django_use_email_as_username.admin import BaseUserAdmin

from .models import User, UserProfile, UserSocialLinks, UserPaymentProfile, UserFavoritePractitioner


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ['display_name', 'bio', 'avatar_url', 'gender', 'birthdate', 'location']


class UserSocialLinksInline(admin.StackedInline):
    model = UserSocialLinks
    can_delete = False
    verbose_name_plural = 'Social Links'


class UserPaymentProfileInline(admin.StackedInline):
    model = UserPaymentProfile
    can_delete = False
    verbose_name_plural = 'Payment Profile'
    readonly_fields = ['stripe_customer_id', 'stripe_account_id']


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    list_display = ['email', 'uuid', 'full_name', 'is_practitioner', 'account_status', 
                   'phone_verified', 'last_active', 'created_at']
    list_filter = ['is_practitioner', 'account_status', 'phone_number_verified', 
                   'is_staff', 'is_active', 'created_at']
    search_fields = ['email', 'first_name', 'last_name', 'phone_number']
    readonly_fields = ['uuid', 'last_login', 'date_joined', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'password', 'uuid')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'phone_number', 'phone_number_verified', 'timezone')
        }),
        ('Status & Permissions', {
            'fields': ('is_practitioner', 'account_status', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('System Info', {
            'fields': ('last_login_ip', 'last_active', 'last_login', 'date_joined', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [UserProfileInline, UserSocialLinksInline, UserPaymentProfileInline]
    
    def phone_verified(self, obj):
        """Display phone verification status with colored indicator."""
        if obj.phone_number_verified:
            return format_html('<span style="color: green;">✓ Verified</span>')
        elif obj.phone_number:
            return format_html('<span style="color: orange;">⚠ Unverified</span>')
        return format_html('<span style="color: gray;">No phone</span>')
    phone_verified.short_description = 'Phone Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile')


# @admin.register(UserProfile)
# class UserProfileAdmin(admin.ModelAdmin):
#     list_display = ['user_email', 'display_name', 'gender', 'birthdate', 'location', 'created_at']
#     list_filter = ['gender', 'created_at']
#     search_fields = ['user__email', 'user__first_name', 'user__last_name', 'display_name']
#     readonly_fields = ['created_at', 'updated_at']
#     
#     def user_email(self, obj):
#         return obj.user.email
#     user_email.short_description = 'User Email'
#     user_email.admin_order_field = 'user__email'


@admin.register(UserSocialLinks)
class UserSocialLinksAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'has_instagram', 'has_twitter', 'has_linkedin', 'has_website']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    
    def has_instagram(self, obj):
        return bool(obj.instagram)
    has_instagram.boolean = True
    
    def has_twitter(self, obj):
        return bool(obj.twitter)
    has_twitter.boolean = True
    
    def has_linkedin(self, obj):
        return bool(obj.linkedin)
    has_linkedin.boolean = True
    
    def has_website(self, obj):
        return bool(obj.website)
    has_website.boolean = True


@admin.register(UserPaymentProfile)
class UserPaymentProfileAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'has_stripe_customer', 'default_currency', 'created_at']
    list_filter = ['default_currency', 'created_at']
    search_fields = ['user__email', 'stripe_customer_id']
    readonly_fields = ['stripe_customer_id', 'stripe_account_id', 'created_at', 'updated_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    
    def has_stripe_customer(self, obj):
        return bool(obj.stripe_customer_id)
    has_stripe_customer.boolean = True
    has_stripe_customer.short_description = 'Stripe Customer'


@admin.register(UserFavoritePractitioner)
class UserFavoritePractitionerAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'practitioner_name', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'practitioner__user__email', 'practitioner__display_name']
    readonly_fields = ['created_at', 'updated_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    
    def practitioner_name(self, obj):
        return str(obj.practitioner)
    practitioner_name.short_description = 'Practitioner'
