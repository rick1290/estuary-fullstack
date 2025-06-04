from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from utils.models import BaseModel, PublicModel


class Order(PublicModel):
    """
    Model representing an order.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    )
    
    ORDER_TYPE_CHOICES = (
        ('direct', 'Direct Service Purchase'),
        ('credit', 'Credit Purchase'),
        ('package', 'Package Purchase'),
        ('subscription', 'Subscription'),
    )
    
    PAYMENT_METHOD_CHOICES = (
        ('stripe', 'Stripe'),
        ('credits', 'Credits'),
        ('manual', 'Manual'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='orders')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='stripe')
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_payment_method_id = models.CharField(max_length=200, blank=True)
    
    # Amount fields using DecimalField for financial accuracy
    subtotal_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    credits_applied = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='direct')
    currency = models.CharField(max_length=3, default='USD')
    
    # Relationships
    service = models.ForeignKey(
        'services.Service', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='orders'
    )
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='orders_as_practitioner'
    )
    
    # Metadata and tracking
    metadata = models.JSONField(default=dict, blank=True)
    tax_details = models.JSONField(default=dict, blank=True)
    audit_log = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['practitioner', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['order_type']),
            models.Index(fields=['stripe_payment_intent_id']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_amount__gte=0),
                name='payments_order_total_amount_positive'
            ),
        ]

    def clean(self):
        super().clean()
        # Calculate total amount
        calculated_total = self.subtotal_amount + self.tax_amount - self.credits_applied
        if abs(calculated_total - self.total_amount) > Decimal('0.01'):
            raise ValidationError("Total amount must equal subtotal + tax - credits applied")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_paid(self):
        return self.status in ['completed', 'refunded', 'partially_refunded']

    def __str__(self):
        return f"Order {str(self.public_uuid)[:8]}... - {self.total_amount} {self.currency} - {self.status}"


class CreditTransaction(BaseModel):
    """
    Model representing a credit transaction.
    """
    TRANSACTION_TYPES = (
        ('purchase', 'Purchase'),
        ('consumption', 'Consumption'),
        ('refund', 'Refund'),
        ('adjustment', 'Adjustment'),
        ('bonus', 'Bonus'),
        ('transfer', 'Transfer'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='credit_transactions')
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Positive for credits added, negative for credits consumed"
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    
    # Relationships
    service = models.ForeignKey(
        'services.Service', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='credit_transactions'
    )
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='credit_transactions_as_practitioner'
    )
    order = models.ForeignKey(
        Order, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='credit_transactions'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='user_credit_transactions'
    )
    reference_transaction = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        help_text="Link to original transaction for refunds/adjustments"
    )
    
    # Additional fields
    currency = models.CharField(max_length=3, default='USD')
    exchange_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=6, 
        blank=True, 
        null=True,
        help_text="Exchange rate if currency conversion was applied"
    )
    expires_at = models.DateTimeField(blank=True, null=True)
    is_expired = models.BooleanField(default=False)
    description = models.TextField(blank=True, help_text="Human-readable description")
    audit_log = models.JSONField(default=list, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['practitioner', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
            models.Index(fields=['order']),
            models.Index(fields=['booking']),
            models.Index(fields=['expires_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(amount=0),
                name='payments_credittransaction_amount_nonzero'
            ),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update user's credit balance
        UserCreditBalance.update_balance(self.user)

    @property
    def is_credit(self):
        """Returns True if this transaction adds credits to the user's balance"""
        return self.amount > 0

    @property
    def is_debit(self):
        """Returns True if this transaction removes credits from the user's balance"""
        return self.amount < 0

    def __str__(self):
        sign = "+" if self.amount > 0 else ""
        return f"Credit Transaction {str(self.id)[:8]}... - {sign}{self.amount} {self.currency}"


class PaymentMethod(BaseModel):
    """
    Model representing a payment method.
    """
    CARD_BRANDS = (
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
        ('amex', 'American Express'),
        ('discover', 'Discover'),
        ('diners', 'Diners Club'),
        ('jcb', 'JCB'),
        ('unionpay', 'UnionPay'),
        ('unknown', 'Unknown'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='payment_methods')
    stripe_payment_method_id = models.CharField(max_length=200, unique=True)
    
    # Card details
    brand = models.CharField(max_length=20, choices=CARD_BRANDS, default='unknown')
    last4 = models.CharField(max_length=4)
    exp_month = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    exp_year = models.PositiveSmallIntegerField()
    
    # Status
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['stripe_payment_method_id']),
            models.Index(fields=['user', 'is_default']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(is_default=True),
                name='payments_paymentmethod_one_default_per_user'
            ),
        ]

    def clean(self):
        super().clean()
        if self.exp_year < 2000:
            raise ValidationError("Expiration year must be a 4-digit year")

    def save(self, *args, **kwargs):
        # If this is being set as default, unset other default methods for this user
        if self.is_default:
            PaymentMethod.objects.filter(user=self.user, is_default=True).exclude(
                id=self.id
            ).update(is_default=False)
        
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if the payment method is expired"""
        from django.utils import timezone
        now = timezone.now()
        return (self.exp_year < now.year or 
                (self.exp_year == now.year and self.exp_month < now.month))

    @property
    def masked_number(self):
        """Return masked card number"""
        return f"**** **** **** {self.last4}"
        
    def __str__(self):
        return f"{self.brand.title()} {self.masked_number}"


class PractitionerCreditTransaction(models.Model):
    """
    Model representing credit transactions for practitioners.
    """
    PAYOUT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('ready', 'Ready for Payout'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('rejected', 'Rejected'),
        ('on_hold', 'On Hold'),
    )
    
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    credits_earned = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    commission = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    net_credits = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    practitioner = models.ForeignKey('practitioners.Practitioner', models.DO_NOTHING, blank=True, null=True)
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default='pending')
    payout = models.ForeignKey('PractitionerPayout', models.DO_NOTHING, blank=True, null=True)
    booking = models.ForeignKey('bookings.Booking', models.DO_NOTHING, blank=True, null=True, related_name='credit_transactions')
    currency = models.CharField(max_length=3, default='USD')
    audit_log = models.JSONField(blank=True, null=True)  # Store history of changes
    
    # New fields for improved tracking
    notes = models.TextField(blank=True, null=True, help_text="Additional information about this transaction")
    transaction_type = models.CharField(max_length=50, default='booking_completion', 
                                      help_text="Source of the transaction (e.g., booking_completion, package_partial, refund)")
    batch_id = models.UUIDField(blank=True, null=True, help_text="ID for grouping related transactions")
    ready_for_payout_date = models.DateTimeField(blank=True, null=True)
    processed_by = models.ForeignKey('users.User', models.SET_NULL, blank=True, null=True, related_name='processed_transactions')
    external_fees = models.JSONField(blank=True, null=True, help_text="Details of external fees applied to this transaction")

    class Meta:
        # Using Django's default naming convention (payments_practitionercredittransaction)
        indexes = [
            models.Index(fields=['practitioner', 'created_at']),
            models.Index(fields=['payout_status']),
            models.Index(fields=['payout']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['batch_id']),
        ]

    def __str__(self):
        return f"Practitioner Credit Transaction {self.id} - {self.net_credits}"
        
    def mark_ready_for_payout(self):
        """Mark this transaction as ready for payout."""
        if self.payout_status == 'pending':
            self.payout_status = 'ready'
            self.ready_for_payout_date = timezone.now()
            self.save(update_fields=['payout_status', 'ready_for_payout_date'])
            return True
        return False


class PractitionerPayout(models.Model):
    """
    Model representing payouts to practitioners.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    )
    
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    practitioner = models.ForeignKey('practitioners.Practitioner', models.DO_NOTHING, blank=True, null=True)
    payout_date = models.DateTimeField(blank=True, null=True)
    credits_payout = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    cash_payout = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    commission_collected = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    stripe_account_id = models.TextField(blank=True, null=True)
    stripe_transfer_id = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    batch_id = models.UUIDField(blank=True, null=True)
    currency = models.CharField(max_length=3, default='USD')
    
    # New fields for improved tracking
    processed_by = models.ForeignKey('users.User', models.SET_NULL, blank=True, null=True, related_name='processed_payouts')
    notes = models.TextField(blank=True, null=True)
    payment_method = models.CharField(max_length=50, default='stripe', help_text="Method used for payout (e.g., stripe, manual)")
    error_message = models.TextField(blank=True, null=True)
    transaction_fee = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Using Django's default naming convention (payments_practitionerpayout)
        indexes = [
            models.Index(fields=['practitioner']),
            models.Index(fields=['status']),
            models.Index(fields=['payout_date']),
            models.Index(fields=['batch_id']),
        ]
    
    def __str__(self):
        return f"Payout {self.id} - {self.practitioner} - {self.credits_payout} credits"
    
    @property
    def transaction_count(self):
        """Get the number of transactions in this payout."""
        return self.practitionercredittransaction_set.count()
    
    def mark_as_completed(self, transfer_id=None):
        """Mark this payout as completed."""
        if transfer_id:
            self.stripe_transfer_id = transfer_id
        
        self.status = 'completed'
        self.payout_date = timezone.now()
        self.save(update_fields=['status', 'payout_date', 'stripe_transfer_id'])
        
        # Update all related transactions
        self.practitionercredittransaction_set.update(payout_status='paid')
        
        return True
    
    @classmethod
    def create_batch_payout(cls, practitioner, transactions, processed_by=None, notes=None):
        """
        Create a batch payout for multiple transactions.
        
        Args:
            practitioner: The practitioner to pay
            transactions: QuerySet of PractitionerCreditTransaction objects
            processed_by: User who processed this payout
            notes: Optional notes about this payout
            
        Returns:
            PractitionerPayout: The created payout object
        """
        from uuid import uuid4
        
        # Calculate total credits
        total_credits = transactions.aggregate(
            total=models.Sum('net_credits')
        )['total'] or 0
        
        # Calculate total commission
        total_commission = transactions.aggregate(
            total=models.Sum('commission')
        )['total'] or 0
        
        # Create the payout
        batch_id = uuid4()
        payout = cls.objects.create(
            practitioner=practitioner,
            credits_payout=total_credits,
            commission_collected=total_commission,
            batch_id=batch_id,
            processed_by=processed_by,
            notes=notes,
            status='pending'
        )
        
        # Link transactions to this payout
        transactions.update(
            payout=payout,
            payout_status='approved',
            batch_id=batch_id
        )
        
        return payout


class UserCreditBalance(BaseModel):
    """
    Model for tracking user credit balances for faster lookups.
    This avoids having to sum all CreditTransaction records for high-volume users.
    """
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='credit_balance')
    balance = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    last_transaction = models.ForeignKey(
        CreditTransaction, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='+'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['balance']),
        ]
        
    def __str__(self):
        return f"{self.user} - {self.balance} credits"
    
    @classmethod
    def update_balance(cls, user):
        """
        Update the user's credit balance by recalculating from all transactions.
        """
        from django.db.models import Sum
        
        # Calculate the current balance
        transactions = CreditTransaction.objects.filter(user=user)
        balance = transactions.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Get or create the balance record
        credit_balance, created = cls.objects.get_or_create(user=user)
        
        # Update the balance
        credit_balance.balance = balance
        
        # Set the last transaction if there are any
        last_transaction = transactions.order_by('-created_at').first()
        if last_transaction:
            credit_balance.last_transaction = last_transaction
            
        credit_balance.save()
        return credit_balance


class SubscriptionTier(BaseModel):
    """
    Model representing subscription tiers for practitioners.
    Different tiers can have different commission rates.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    monthly_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    annual_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'subscription_tiers'
        ordering = ['order', 'monthly_price']
        indexes = [
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name


class PractitionerSubscription(models.Model):
    """
    Model representing a practitioner's subscription to a tier.
    """
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('canceled', 'Canceled'),
        ('past_due', 'Past Due'),
        ('trialing', 'Trialing'),
        ('unpaid', 'Unpaid'),
    )
    
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='subscriptions')
    tier = models.ForeignKey(SubscriptionTier, on_delete=models.CASCADE, related_name='subscribers')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(blank=True, null=True)
    is_annual = models.BooleanField(default=False)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, null=True)
    auto_renew = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'practitioner_subscriptions'
        indexes = [
            models.Index(fields=['practitioner']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
        ]
    
    def __str__(self):
        return f"{self.practitioner} - {self.tier} ({self.status})"
    
    @property
    def is_active(self):
        """Check if the subscription is currently active."""
        return (
            self.status == 'active' and 
            (self.end_date is None or self.end_date > timezone.now())
        )


class ServiceTypeCommission(models.Model):
    """
    Model for defining commission rates for different service types.
    This allows for different commission rates based on service type (session, workshop, course, etc.)
    """
    service_type = models.ForeignKey('services.ServiceType', on_delete=models.CASCADE, related_name='commission_rates')
    base_rate = models.DecimalField(max_digits=5, decimal_places=2, 
                                    validators=[MinValueValidator(0), MaxValueValidator(100)],
                                    help_text="Base commission rate as a percentage (e.g., 15.00 for 15%)")
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'service_type_commissions'
        indexes = [
            models.Index(fields=['service_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.service_type.name} - {self.base_rate}%"


class TierCommissionAdjustment(models.Model):
    """
    Model for adjusting commission rates based on subscription tier.
    This allows for tier-specific commission rate adjustments for each service type.
    """
    tier = models.ForeignKey(SubscriptionTier, on_delete=models.CASCADE, related_name='commission_adjustments')
    service_type_commission = models.ForeignKey(ServiceTypeCommission, on_delete=models.CASCADE, related_name='tier_adjustments')
    adjustment_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                              validators=[MinValueValidator(-100), MaxValueValidator(100)],
                                              help_text="Adjustment to base rate in percentage points (e.g., -5.00 reduces rate by 5%)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tier_commission_adjustments'
        unique_together = ('tier', 'service_type_commission')
        indexes = [
            models.Index(fields=['tier']),
            models.Index(fields=['service_type_commission']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.tier.name} - {self.service_type_commission.service_type.name} ({self.adjustment_percentage}%)"
    
    @property
    def effective_rate(self):
        """Calculate the effective commission rate after adjustment."""
        base_rate = self.service_type_commission.base_rate
        adjusted_rate = base_rate + self.adjustment_percentage
        # Ensure rate stays between 0 and 100
        return max(0, min(100, adjusted_rate))


class ExternalServiceFee(models.Model):
    """
    Model for tracking external service fees (like Stripe, Daily.co) 
    that may be passed on to practitioners.
    """
    name = models.CharField(max_length=100)
    fee_type = models.CharField(max_length=20, choices=[
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ])
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_type = models.ForeignKey('services.ServiceType', on_delete=models.SET_NULL, 
                                    related_name='external_fees', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_practitioner_responsible = models.BooleanField(default=False, 
                                                    help_text="If True, this fee is deducted from practitioner earnings")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'external_service_fees'
        indexes = [
            models.Index(fields=['service_type']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.amount}{'%' if self.fee_type == 'percentage' else ''}"
    
    def calculate_fee(self, base_amount):
        """Calculate the fee amount based on the base amount."""
        if self.fee_type == 'percentage':
            return (self.amount / 100) * base_amount
        return self.amount  # Fixed fee


class PackageCompletionRecord(models.Model):
    """
    Model for tracking package/course completion status for payout purposes.
    This helps ensure faculty are only paid when a package is fully completed.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partially_completed', 'Partially Completed'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
    )
    
    package_booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='completion_record')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_sessions = models.PositiveIntegerField(default=0)
    completed_sessions = models.PositiveIntegerField(default=0)
    payout_processed = models.BooleanField(default=False)
    payout_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Fields for progressive payouts
    last_payout_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_payout_date = models.DateTimeField(blank=True, null=True)
    total_paid_credits = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'package_completion_records'
        indexes = [
            models.Index(fields=['package_booking']),
            models.Index(fields=['status']),
            models.Index(fields=['payout_processed']),
        ]
    
    def __str__(self):
        return f"Package {self.package_booking.id} - {self.completion_percentage}% complete"
    
    def update_completion_status(self):
        """Update the completion status based on child bookings."""
        from django.utils import timezone
        
        # Get all child bookings
        child_bookings = self.package_booking.child_bookings.all()
        self.total_sessions = child_bookings.count()
        
        if self.total_sessions == 0:
            return
        
        # Count completed sessions
        self.completed_sessions = child_bookings.filter(status='completed').count()
        
        # Calculate completion percentage
        previous_percentage = self.completion_percentage
        self.completion_percentage = (self.completed_sessions / self.total_sessions) * 100
        
        # Update status based on completion percentage
        if self.completion_percentage == 100:
            self.status = 'completed'
        elif self.completion_percentage > 0:
            self.status = 'partially_completed'
        
        # Check if package booking is canceled
        if self.package_booking.status == 'canceled':
            self.status = 'canceled'
            
        self.save()
        
        # Process progressive payout if completion percentage increased
        if self.completion_percentage > self.last_payout_percentage and self.status != 'canceled':
            self.process_partial_payout()
        
        # Process final payout if completed and not yet fully processed
        if self.status == 'completed' and not self.payout_processed:
            self.process_final_payout()
    
    def process_partial_payout(self):
        """Process partial payout based on newly completed sessions."""
        from django.utils import timezone
        
        # Calculate credits for newly completed sessions
        newly_completed_percentage = self.completion_percentage - self.last_payout_percentage
        
        # Get total package value
        total_package_value = self.package_booking.credit_value or 0
        
        # Calculate credits to pay out for this partial completion
        credits_for_partial_payout = (newly_completed_percentage / 100) * total_package_value
        
        # Get the practitioner
        practitioner = self.package_booking.practitioner
        
        # Get service type for commission calculation
        service_type = self.package_booking.service.service_type
        
        # Calculate commission
        from apps.payments.services import CommissionCalculator
        calculator = CommissionCalculator()
        commission_rate = calculator.get_commission_rate(practitioner, service_type)
        commission_amount = (commission_rate / 100) * credits_for_partial_payout
        net_credits = credits_for_partial_payout - commission_amount
        
        # Create practitioner credit transaction for partial payout
        PractitionerCreditTransaction.objects.create(
            practitioner=practitioner,
            credits_earned=credits_for_partial_payout,
            commission=commission_amount,
            commission_rate=commission_rate,
            net_credits=net_credits,
            booking=self.package_booking,
            payout_status='pending',
            notes=f"Partial payout ({newly_completed_percentage:.1f}% of package)"
        )
        
        # Update payout tracking
        self.last_payout_percentage = self.completion_percentage
        self.last_payout_date = timezone.now()
        self.total_paid_credits += credits_for_partial_payout
        self.save()
    
    def process_final_payout(self):
        """Process final payout for completed package."""
        from django.utils import timezone
        
        # If everything is already paid out, just mark as processed
        if self.completion_percentage <= self.last_payout_percentage:
            self.payout_processed = True
            self.payout_date = timezone.now()
            self.save()
            return
        
        # Calculate remaining credits to be paid
        total_package_value = self.package_booking.credit_value or 0
        remaining_credits = total_package_value - self.total_paid_credits
        
        # If no remaining credits, just mark as processed
        if remaining_credits <= 0:
            self.payout_processed = True
            self.payout_date = timezone.now()
            self.save()
            return
        
        # Get the practitioner
        practitioner = self.package_booking.practitioner
        
        # Get service type for commission calculation
        service_type = self.package_booking.service.service_type
        
        # Calculate commission
        from apps.payments.services import CommissionCalculator
        calculator = CommissionCalculator()
        commission_rate = calculator.get_commission_rate(practitioner, service_type)
        commission_amount = (commission_rate / 100) * remaining_credits
        net_credits = remaining_credits - commission_amount
        
        # Create practitioner credit transaction for final payout
        PractitionerCreditTransaction.objects.create(
            practitioner=practitioner,
            credits_earned=remaining_credits,
            commission=commission_amount,
            commission_rate=commission_rate,
            net_credits=net_credits,
            booking=self.package_booking,
            payout_status='pending',
            notes="Final package completion payout"
        )
        
        # Update payout status
        self.payout_processed = True
        self.payout_date = timezone.now()
        self.total_paid_credits += remaining_credits
        self.last_payout_percentage = 100
        self.save()
    
    def process_payout(self):
        """Legacy method for backward compatibility."""
        if self.status == 'completed':
            self.process_final_payout()
        else:
            self.process_partial_payout()