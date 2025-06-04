import string
import random
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from utils.models import BaseModel


def generate_referral_code():
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(8))


class ReferralProgram(BaseModel):
    """
    Model for configuring referral program settings.
    """
    REWARD_TYPES = (
        ('credits', 'Credits'),
        ('cash', 'Cash'),
        ('discount', 'Discount'),
    )
    
    CONVERSION_CRITERIA = (
        ('signup', 'Signup'),
        ('first_purchase', 'First Purchase'),
        ('min_purchase', 'Minimum Purchase'),
    )
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    referrer_reward_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    referred_reward_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPES, default='credits')
    min_purchase_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    conversion_criteria = models.CharField(max_length=20, choices=CONVERSION_CRITERIA, default='first_purchase')
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(blank=True, null=True)
    max_referrals_per_user = models.PositiveIntegerField(default=0, help_text="0 means unlimited")
    
    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'start_date']),
            models.Index(fields=['reward_type']),
        ]
    
    def __str__(self):
        return self.name


class Referral(BaseModel):
    """
    Model for tracking user referrals.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('converted', 'Converted'),
        ('expired', 'Expired'),
        ('rejected', 'Rejected'),
    )
    
    REWARD_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('issued', 'Issued'),
        ('claimed', 'Claimed'),
        ('expired', 'Expired'),
    )
    
    program = models.ForeignKey(ReferralProgram, on_delete=models.CASCADE, related_name='referrals')
    referrer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='referrals_made')
    referred = models.ForeignKey(
        'users.User', 
        on_delete=models.CASCADE, 
        related_name='referred_by', 
        blank=True, 
        null=True
    )
    code = models.CharField(max_length=20, unique=True, default=generate_referral_code)
    email_sent_to = models.EmailField(blank=True)
    
    # Status tracking
    converted_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    referrer_reward_status = models.CharField(max_length=20, choices=REWARD_STATUS_CHOICES, default='pending')
    referred_reward_status = models.CharField(max_length=20, choices=REWARD_STATUS_CHOICES, default='pending')
    
    # Reward amounts
    referrer_reward_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    referred_reward_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # Related objects
    qualifying_order = models.ForeignKey(
        'payments.Order', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='qualifying_referrals'
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['referrer', 'status']),
            models.Index(fields=['referred']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['program', 'status']),
        ]
    
    def __str__(self):
        if self.referred:
            return f"Referral from {self.referrer} to {self.referred}"
        return f"Pending referral from {self.referrer} ({self.code})"
    
    def mark_as_converted(self, referred_user, qualifying_order=None):
        """
        Mark the referral as converted and issue rewards
        """
        from django.utils import timezone
        from apps.payments.models import CreditTransaction
        
        # Update referral status
        self.referred = referred_user
        self.status = 'converted'
        self.converted_at = timezone.now()
        self.qualifying_order = qualifying_order
        
        # Set reward amounts based on program settings
        self.referrer_reward_amount = self.program.referrer_reward_amount
        self.referred_reward_amount = self.program.referred_reward_amount
        
        # Issue rewards if reward type is credits
        if self.program.reward_type == 'credits':
            # Create credit transaction for referrer
            CreditTransaction.objects.create(
                user=self.referrer,
                amount=self.referrer_reward_amount,
                transaction_type='adjustment',
                description=f"Referral reward for inviting {self.referred}",
                metadata={'referral_id': str(self.id)}
            )
            self.referrer_reward_status = 'issued'
            
            # Create credit transaction for referred user
            CreditTransaction.objects.create(
                user=self.referred,
                amount=self.referred_reward_amount,
                transaction_type='adjustment',
                description=f"Welcome reward for joining via referral from {self.referrer}",
                metadata={'referral_id': str(self.id)}
            )
            self.referred_reward_status = 'issued'
        
        self.save()


class ReferralCampaign(BaseModel):
    """
    Model for tracking marketing campaigns with special referral incentives.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    program = models.ForeignKey(ReferralProgram, on_delete=models.CASCADE, related_name='campaigns')
    campaign_code = models.CharField(max_length=20, unique=True)
    bonus_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['campaign_code']),
            models.Index(fields=['program', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    @property
    def is_currently_active(self):
        """Check if campaign is active and within date range"""
        if not self.is_active:
            return False
        now = timezone.now()
        return self.start_date <= now <= self.end_date
    
    def __str__(self):
        return self.name
