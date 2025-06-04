import uuid
from typing import ClassVar

from django.db import models
from django.urls import reverse
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _
from django_use_email_as_username.models import BaseUser, BaseUserManager
from utils.models import BaseModel


# Gender choices
GENDER_CHOICES = [
    ('male', _('Male')),
    ('female', _('Female')),
    ('non_binary', _('Non-binary')),
    ('prefer_not_to_say', _('Prefer not to say')),
    ('other', _('Other')),
]

# Phone number validator
phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message=_("Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.")
)


class User(BaseUser):
    """
    Core user model with essential authentication and basic profile fields.
    Extended profile information is stored in related models.
    """
    # Public UUID for API exposure (BaseUser already has integer PK)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    
    # Essential profile fields
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    phone_number = models.CharField(
        max_length=17, 
        validators=[phone_validator], 
        blank=True, 
        null=True,
        help_text=_('Phone number in international format')
    )
    phone_number_verified = models.BooleanField(default=False)
    timezone = models.CharField(
        max_length=50, 
        default='UTC',
        help_text=_('User\'s preferred timezone (e.g., "America/New_York", "Europe/London")')
    )
    
    # User role and status
    is_practitioner = models.BooleanField(default=False)
    account_status = models.CharField(max_length=20, choices=[
        ('active', _('Active')),
        ('inactive', _('Inactive')),
        ('suspended', _('Suspended')),
        ('pending', _('Pending Verification')),
        ('deleted', _('Deleted')),
    ], default='active')
    
    # System tracking
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    last_active = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = BaseUserManager()
    
    def get_absolute_url(self):
        """Get URL for user's detail view."""
        return reverse('users:detail', kwargs={'uuid': self.uuid})
    
    @property
    def full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip() or self.email
    
    @property
    def display_name(self):
        """Return name for display purposes."""
        profile = getattr(self, 'profile', None)
        if profile and profile.display_name:
            return profile.display_name
        return self.full_name
    
    def __str__(self):
        return self.display_name
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['uuid']),
            models.Index(fields=['is_practitioner']),
            models.Index(fields=['account_status']),
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['last_active']),
            models.Index(fields=['created_at']),
        ]


class UserProfile(BaseModel):
    """
    Extended user profile information.
    Separates profile data from core authentication model.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Profile fields
    display_name = models.CharField(max_length=255, blank=True, null=True,
                                  help_text=_('Public display name'))
    bio = models.TextField(blank=True, null=True, max_length=1000)
    avatar_url = models.URLField(blank=True, null=True, 
                               help_text=_('URL to profile image'))
    
    # Personal information
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    birthdate = models.DateField(blank=True, null=True)
    
    # Verification
    phone_verification_token = models.CharField(max_length=6, blank=True, null=True)
    
    # Location preference (can be linked to Location model later)
    location = models.ForeignKey('utils.Location', on_delete=models.SET_NULL, 
                               blank=True, null=True, related_name='user_profiles')
    
    class Meta:
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')
    
    def __str__(self):
        return f"Profile for {self.user.email}"


class UserSocialLinks(BaseModel):
    """
    Social media links for users.
    Separate model to keep User model clean.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='social_links')
    
    # Social media URLs
    instagram = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True) 
    linkedin = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    tiktok = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    
    class Meta:
        verbose_name = _('user social links')
        verbose_name_plural = _('user social links')
    
    def __str__(self):
        return f"Social links for {self.user.email}"


class UserPaymentProfile(BaseModel):
    """
    Payment and billing information for users.
    Separate model for PCI compliance and security.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='payment_profile')
    
    # Stripe information
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Billing information
    billing_address = models.JSONField(blank=True, null=True,
                                     help_text=_('Structured billing address'))
    
    # Payment preferences
    default_currency = models.CharField(max_length=3, default='USD',
                                      help_text=_('ISO 4217 currency code'))
    
    class Meta:
        verbose_name = _('user payment profile')
        verbose_name_plural = _('user payment profiles')
    
    def __str__(self):
        return f"Payment profile for {self.user.email}"


class UserFavoritePractitioner(BaseModel):
    """
    Track user's favorite practitioners.
    Moved from old implementation with improved structure.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_practitioners')
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE,
                                   related_name='favorited_by')
    
    class Meta:
        verbose_name = _('user favorite practitioner')
        verbose_name_plural = _('user favorite practitioners')
        unique_together = ['user', 'practitioner']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['practitioner']),
        ]
    
    def __str__(self):
        return f"{self.user.email} favorites {self.practitioner}"
