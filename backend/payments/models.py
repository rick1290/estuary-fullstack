from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from utils.models import BaseModel, PublicModel
from .constants import SubscriptionTierCode


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
        ('bundle', 'Bundle Purchase'),
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
    
    # Amount fields in cents
    subtotal_amount_cents = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Subtotal in cents"
    )
    tax_amount_cents = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Tax amount in cents"
    )
    credits_applied_cents = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Credits applied in cents"
    )
    total_amount_cents = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Total amount in cents"
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

    # Package/Bundle specific data
    package_metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Package/bundle specific data"
    )
    # Structure:
    # {
    #   'package_type': 'package' | 'bundle',
    #   'total_sessions': 5,
    #   'sessions_completed': 0,
    #   'session_value_cents': 8000,
    #   'package_service_id': 123,
    #   'expires_at': '2025-12-31T00:00:00Z'
    # }

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
                check=models.Q(total_amount_cents__gte=0),
                name='payments_order_total_amount_positive'
            ),
        ]

    def clean(self):
        super().clean()
        # Calculate total amount
        calculated_total = self.subtotal_amount_cents + self.tax_amount_cents - self.credits_applied_cents
        if calculated_total != self.total_amount_cents:
            raise ValidationError("Total amount must equal subtotal + tax - credits applied")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_paid(self):
        return self.status in ['completed', 'refunded', 'partially_refunded']

    def __str__(self):
        return f"Order {str(self.public_uuid)[:8]}... - ${self.total_amount} {self.currency} - {self.status}"
    
    @property
    def total_amount(self):
        """Get total amount in dollars."""
        return Decimal(self.total_amount_cents) / 100
    
    @property
    def subtotal_amount(self):
        """Get subtotal in dollars."""
        return Decimal(self.subtotal_amount_cents) / 100

    # Package/Bundle helper properties
    @property
    def is_package_or_bundle(self):
        """True if this order is for a package or bundle"""
        return self.order_type in ['package', 'bundle']

    @property
    def total_sessions(self):
        """Total sessions in package/bundle"""
        if self.package_metadata:
            return self.package_metadata.get('total_sessions', 0)
        return 0

    @property
    def sessions_completed(self):
        """Number of completed sessions"""
        if self.package_metadata:
            return self.package_metadata.get('sessions_completed', 0)
        return 0

    @property
    def session_value_cents(self):
        """Value per session in cents"""
        if self.package_metadata:
            return self.package_metadata.get('session_value_cents', 0)
        return 0

    @property
    def sessions_remaining(self):
        """Number of sessions remaining"""
        return self.total_sessions - self.sessions_completed

    def increment_sessions_completed(self):
        """Increment completed session count"""
        if not self.package_metadata:
            return

        self.package_metadata['sessions_completed'] = (
            self.package_metadata.get('sessions_completed', 0) + 1
        )
        self.save(update_fields=['package_metadata'])


class UserCreditTransaction(BaseModel):
    """
    Model representing a user's credit transaction.
    Credits are prepaid value that users can spend on services.
    """
    TRANSACTION_TYPES = (
        ('purchase', 'Purchase'),  # User bought credits
        ('usage', 'Usage'),  # User spent credits on service
        ('refund', 'Refund'),  # Credits returned to user
        ('adjustment', 'Adjustment'),  # Manual adjustment
        ('bonus', 'Bonus'),  # Free credits given
        ('transfer', 'Transfer'),  # Credits transferred between users
        ('expiry', 'Expiry'),  # Credits expired
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='credit_transactions')
    amount_cents = models.IntegerField(
        help_text="Amount in cents. Positive for credits added, negative for credits consumed"
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    
    # Relationships
    service = models.ForeignKey(
        'services.Service', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='user_credit_transactions'
    )
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='user_credit_transactions_as_practitioner'
    )
    order = models.ForeignKey(
        Order, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='user_credit_transactions'
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
    metadata = models.JSONField(default=dict, blank=True)

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
                check=~models.Q(amount_cents=0),
                name='payments_usercredittransaction_amount_nonzero'
            ),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update user's credit balance
        UserCreditBalance.update_balance(self.user)

    @property
    def amount(self):
        """Get amount in dollars."""
        return Decimal(self.amount_cents) / 100
    
    @property
    def is_credit(self):
        """Returns True if this transaction adds credits to the user's balance"""
        return self.amount_cents > 0

    @property
    def is_debit(self):
        """Returns True if this transaction removes credits from the user's balance"""
        return self.amount_cents < 0

    def __str__(self):
        sign = "+" if self.amount_cents > 0 else ""
        return f"User Credit Transaction {str(self.id)[:8]}... - {sign}${self.amount} {self.currency}"


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


class PractitionerEarnings(BaseModel):
    """
    Model tracking practitioner's earnings balance.
    This is separate from user credits - it tracks money owed to practitioners.
    """
    practitioner = models.OneToOneField(
        'practitioners.Practitioner', 
        on_delete=models.CASCADE, 
        related_name='earnings_balance'
    )
    pending_balance_cents = models.IntegerField(
        default=0,
        help_text="Earnings not yet eligible for payout in cents"
    )
    available_balance_cents = models.IntegerField(
        default=0,
        help_text="Earnings ready for payout in cents"
    )
    lifetime_earnings_cents = models.IntegerField(
        default=0,
        help_text="Total earnings ever in cents"
    )
    lifetime_payouts_cents = models.IntegerField(
        default=0,
        help_text="Total amount paid out in cents"
    )
    last_payout_date = models.DateTimeField(
        blank=True, 
        null=True,
        help_text="When last payout was processed"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['practitioner']),
            models.Index(fields=['available_balance_cents']),
        ]
        
    def __str__(self):
        return f"{self.practitioner} - Available: ${self.available_balance}"
    
    @property
    def pending_balance(self):
        """Get pending balance in dollars."""
        return Decimal(self.pending_balance_cents) / 100
    
    @property
    def available_balance(self):
        """Get available balance in dollars."""
        return Decimal(self.available_balance_cents) / 100
    
    @property
    def lifetime_earnings(self):
        """Get lifetime earnings in dollars."""
        return Decimal(self.lifetime_earnings_cents) / 100
    
    @property
    def total_balance(self):
        """Total balance (pending + available) in dollars."""
        return self.pending_balance + self.available_balance
    
    def move_pending_to_available(self, amount_cents):
        """Move funds from pending to available (amount in cents)."""
        if amount_cents > self.pending_balance_cents:
            raise ValueError("Insufficient pending balance")
        
        self.pending_balance_cents -= amount_cents
        self.available_balance_cents += amount_cents
        self.save(update_fields=['pending_balance_cents', 'available_balance_cents'])


class EarningsTransaction(BaseModel):
    """
    Model representing practitioner earnings from completed services.
    This replaces PractitionerCreditTransaction for clearer separation.
    """
    TRANSACTION_STATUS = (
        ('projected', 'Projected'),  # Future earnings (booked but not yet delivered)
        ('pending', 'Pending'),  # Waiting for 48hr hold after service delivery
        ('available', 'Available'),  # Ready for payout
        ('paid', 'Paid'),  # Included in a payout
        ('reversed', 'Reversed'),  # Refunded or canceled
    )

    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='earnings_transactions'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='earnings_transactions'
    )

    # Financial details
    gross_amount_cents = models.IntegerField(
        help_text="Service price before commission in cents"
    )
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Commission percentage"
    )
    commission_amount_cents = models.IntegerField(
        help_text="Commission amount deducted in cents"
    )
    net_amount_cents = models.IntegerField(
        help_text="Amount practitioner receives in cents"
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=TRANSACTION_STATUS,
        default='projected'
    )
    available_after = models.DateTimeField(
        help_text="When funds become available for payout"
    )
    
    # Payout tracking
    payout = models.ForeignKey(
        'PractitionerPayout', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='earnings_transactions'
    )
    
    # Additional info
    currency = models.CharField(max_length=3, default='USD')
    description = models.TextField(blank=True)
    transaction_type = models.CharField(
        max_length=50, 
        default='booking_completion',
        help_text="Type of earning (booking_completion, bonus, adjustment)"
    )
    
    # Metadata
    external_fees = models.JSONField(
        blank=True, 
        null=True,
        help_text="External fees applied (Stripe, Daily.co, etc.)"
    )
    metadata = models.JSONField(blank=True, null=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['practitioner', 'status']),
            models.Index(fields=['booking']),
            models.Index(fields=['status', 'available_after']),
            models.Index(fields=['payout']),
        ]
        
    def __str__(self):
        return f"Earnings {self.id} - {self.practitioner} - ${self.net_amount}"
    
    @property
    def gross_amount(self):
        """Get gross amount in dollars."""
        return Decimal(self.gross_amount_cents) / 100
    
    @property
    def commission_amount(self):
        """Get commission amount in dollars."""
        return Decimal(self.commission_amount_cents) / 100
    
    @property
    def net_amount(self):
        """Get net amount in dollars."""
        return Decimal(self.net_amount_cents) / 100
    
    def save(self, *args, **kwargs):
        # Calculate net amount if not set
        if self.gross_amount_cents and self.commission_amount_cents and not self.net_amount_cents:
            self.net_amount_cents = self.gross_amount_cents - self.commission_amount_cents
            
        # Set available_after if not set (48 hours after creation)
        if not self.available_after:
            self.available_after = timezone.now() + timezone.timedelta(hours=48)
            
        super().save(*args, **kwargs)
        
        # Update practitioner's earnings balance
        self._update_practitioner_balance()
    
    def _update_practitioner_balance(self):
        """Update the practitioner's earnings balance."""
        balance, created = PractitionerEarnings.objects.get_or_create(
            practitioner=self.practitioner
        )
        
        # Recalculate balances based on all transactions
        pending_cents = EarningsTransaction.objects.filter(
            practitioner=self.practitioner,
            status='pending'
        ).aggregate(total=models.Sum('net_amount_cents'))['total'] or 0
        
        available_cents = EarningsTransaction.objects.filter(
            practitioner=self.practitioner,
            status='available'
        ).aggregate(total=models.Sum('net_amount_cents'))['total'] or 0
        
        lifetime_cents = EarningsTransaction.objects.filter(
            practitioner=self.practitioner,
            status__in=['pending', 'available', 'paid']
        ).aggregate(total=models.Sum('net_amount_cents'))['total'] or 0
        
        balance.pending_balance_cents = pending_cents
        balance.available_balance_cents = available_cents
        balance.lifetime_earnings_cents = lifetime_cents
        balance.save()
    
    def mark_available(self):
        """Mark transaction as available for payout."""
        if self.status == 'pending' and timezone.now() >= self.available_after:
            self.status = 'available'
            self.save(update_fields=['status'])
            return True
        return False
    
    def mark_paid(self, payout):
        """Mark transaction as paid and link to payout."""
        if self.status == 'available':
            self.status = 'paid'
            self.payout = payout
            self.save(update_fields=['status', 'payout'])
            return True
        return False


# PractitionerCreditTransaction has been replaced by EarningsTransaction
# for clearer separation between user credits and practitioner earnings


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
    credits_payout_cents = models.IntegerField(blank=True, null=True, help_text="Payout amount in cents")
    cash_payout_cents = models.IntegerField(blank=True, null=True, help_text="Cash payout in cents")
    commission_collected_cents = models.IntegerField(blank=True, null=True, help_text="Commission collected in cents")
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
    transaction_fee_cents = models.IntegerField(blank=True, null=True, help_text="Transaction fee in cents")
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
        return f"Payout {self.id} - {self.practitioner} - ${self.credits_payout}"
    
    @property
    def credits_payout(self):
        """Get payout amount in dollars."""
        return Decimal(self.credits_payout_cents) / 100 if self.credits_payout_cents else 0
    
    @property
    def transaction_count(self):
        """Get the number of transactions in this payout."""
        return self.earnings_transactions.count()
    
    def mark_as_completed(self, transfer_id=None):
        """Mark this payout as completed."""
        if transfer_id:
            self.stripe_transfer_id = transfer_id
        
        self.status = 'completed'
        self.payout_date = timezone.now()
        self.save(update_fields=['status', 'payout_date', 'stripe_transfer_id'])
        
        # Update all related earnings transactions
        self.earnings_transactions.update(status='paid')
        
        return True
    
    @classmethod
    def create_batch_payout(cls, practitioner, transactions, processed_by=None, notes=None):
        """
        Create a batch payout for multiple earnings transactions.
        
        Args:
            practitioner: The practitioner to pay
            transactions: QuerySet of EarningsTransaction objects with status='available'
            processed_by: User who processed this payout
            notes: Optional notes about this payout
            
        Returns:
            PractitionerPayout: The created payout object
        """
        from uuid import uuid4
        
        # Only include available transactions
        available_transactions = transactions.filter(status='available')
        
        # Calculate total earnings
        total_earnings_cents = available_transactions.aggregate(
            total=models.Sum('net_amount_cents')
        )['total'] or 0
        
        # Calculate total commission
        total_commission_cents = available_transactions.aggregate(
            total=models.Sum('commission_amount_cents')
        )['total'] or 0
        
        # Create the payout
        batch_id = uuid4()
        payout = cls.objects.create(
            practitioner=practitioner,
            credits_payout_cents=total_earnings_cents,
            commission_collected_cents=total_commission_cents,
            batch_id=batch_id,
            processed_by=processed_by,
            notes=notes,
            status='pending'
        )
        
        # Mark transactions as paid and link to payout
        for transaction in available_transactions:
            transaction.mark_paid(payout)
        
        # Update practitioner's earnings balance
        balance = practitioner.earnings_balance
        balance.available_balance_cents -= total_earnings_cents
        balance.lifetime_payouts_cents += total_earnings_cents
        balance.last_payout_date = timezone.now()
        balance.save()
        
        return payout


class UserCreditBalance(BaseModel):
    """
    Model for tracking user credit balances for faster lookups.
    This avoids having to sum all CreditTransaction records for high-volume users.
    """
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='credit_balance')
    balance_cents = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Balance in cents"
    )
    last_transaction = models.ForeignKey(
        UserCreditTransaction, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='+'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['balance_cents']),
        ]
        
    def __str__(self):
        return f"{self.user} - ${self.balance} credits"
    
    @property
    def balance(self):
        """Get balance in dollars."""
        return Decimal(self.balance_cents) / 100
    
    @classmethod
    def update_balance(cls, user):
        """
        Update the user's credit balance by recalculating from all transactions.
        """
        from django.db.models import Sum
        
        # Calculate the current balance in cents
        transactions = UserCreditTransaction.objects.filter(user=user)
        balance_cents = transactions.aggregate(Sum('amount_cents'))['amount_cents__sum'] or 0
        
        # Get or create the balance record
        credit_balance, created = cls.objects.get_or_create(user=user)
        
        # Update the balance
        credit_balance.balance_cents = balance_cents
        
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
    code = models.CharField(
        max_length=20, 
        choices=SubscriptionTierCode.choices,
        unique=True,
        help_text="Fixed tier identifier used in code"
    )
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
    
    # Stripe integration
    stripe_product_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Stripe Product ID"
    )
    stripe_monthly_price_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Stripe Price ID for monthly billing"
    )
    stripe_annual_price_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Stripe Price ID for annual billing"
    )
    
    class Meta:
        db_table = 'subscription_tiers'
        ordering = ['order', 'monthly_price']
        indexes = [
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_by_code(cls, code):
        """Get tier by code, with caching"""
        from django.core.cache import cache
        cache_key = f'subscription_tier_{code}'
        tier = cache.get(cache_key)
        if not tier:
            try:
                tier = cls.objects.get(code=code, is_active=True)
                cache.set(cache_key, tier, 3600)  # Cache for 1 hour
            except cls.DoesNotExist:
                return None
        return tier


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
        """Update the completion status based on bookings in the order."""
        from django.utils import timezone

        # Get all bookings for this order (package/bundle sessions)
        # In new architecture: all related bookings share the same order
        if not self.package_booking.order:
            return

        order_bookings = self.package_booking.order.bookings.all()
        self.total_sessions = order_bookings.count()

        if self.total_sessions == 0:
            return

        # Count completed sessions
        self.completed_sessions = order_bookings.filter(status='completed').count()
        
        # Calculate completion percentage
        from decimal import Decimal
        previous_percentage = self.completion_percentage
        self.completion_percentage = Decimal(str((self.completed_sessions / self.total_sessions) * 100))
        
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
        
        # Create earnings transaction for partial payout
        EarningsTransaction.objects.create(
            practitioner=practitioner,
            booking=self.package_booking,
            gross_amount=credits_for_partial_payout,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            net_amount=net_credits,
            status='pending',
            available_after=timezone.now() + timezone.timedelta(hours=48),
            transaction_type='package_partial',
            description=f"Partial payout ({newly_completed_percentage:.1f}% of package)"
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
        
        # Create earnings transaction for final payout
        EarningsTransaction.objects.create(
            practitioner=practitioner,
            booking=self.package_booking,
            gross_amount=remaining_credits,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            net_amount=net_credits,
            status='pending',
            available_after=timezone.now() + timezone.timedelta(hours=48),
            transaction_type='package_final',
            description="Final package completion payout"
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