import uuid
from typing import ClassVar

from django.db import models
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django_use_email_as_username.models import BaseUser, BaseUserManager


class User(BaseUser):
    """
    Default custom user model for Estuary.
    If adding fields that need to be filled at user signup,
    check forms.SignupForm and forms.SocialSignupForms accordingly.
    """
    # Keep the primary ID as is (from BaseUser)
    # Add UUID as a secondary ID
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    # Profile information
    name = models.CharField(_('Name of User'), blank=True, max_length=255)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.TextField(blank=True, null=True)
    gender = models.TextField(blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    register_date = models.DateField(blank=True, null=True)
    phone_number = models.TextField(blank=True, null=True)
    phone_number_verified = models.BooleanField(blank=True, null=True)
    phone_verification_token = models.TextField(blank=True, null=True)
    timezone = models.CharField(
        max_length=50, 
        default='UTC',
        help_text=_('User\'s preferred timezone (e.g., "America/New_York", "Europe/London")')
    )
    
    # Social media links
    instagram_link = models.TextField(blank=True, null=True)
    twitter_link = models.TextField(blank=True, null=True)
    linkedin_link = models.TextField(blank=True, null=True)
    youtube_link = models.TextField(blank=True, null=True)
    tiktok_link = models.TextField(blank=True, null=True)
    facebook_link = models.TextField(blank=True, null=True)
    
    # Payment and billing information
    billing_address = models.JSONField(blank=True, null=True)
    payment_method = models.JSONField(blank=True, null=True)
    stripe_account_id = models.TextField(blank=True, null=True)
    stripe_customer_id = models.TextField(blank=True, null=True)
    stripe_payment_method_id = models.TextField(blank=True, null=True)
    
    # User role flag
    is_practitioner = models.BooleanField(default=False)
    
    # System fields
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    account_status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('deleted', 'Deleted'),
    ], default='active')
    last_active = models.DateTimeField(blank=True, null=True)
    
    objects = BaseUserManager()
    
    def get_absolute_url(self):
        """Get URL for user's detail view.
        
        Returns:
            str: URL for user detail.
        """
        return reverse('users:detail', kwargs={'pk': self.pk})
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['is_practitioner']),
            models.Index(fields=['account_status']),
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['uuid']),
        ]
