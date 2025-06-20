"""
Serializers for payments app
"""
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from uuid import UUID

from payments.models import (
    Order, UserCreditTransaction, UserCreditBalance, PaymentMethod,
    EarningsTransaction, PractitionerEarnings, PractitionerPayout,
    SubscriptionTier, PractitionerSubscription, ServiceTypeCommission,
    TierCommissionAdjustment, ExternalServiceFee, PackageCompletionRecord
)
from practitioners.models import Practitioner
from services.models import Service, ServiceType
from users.models import User
from integrations.stripe.client import StripeClient


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods"""
    masked_number = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'user', 'stripe_payment_method_id', 'brand', 'last4',
            'exp_month', 'exp_year', 'is_default', 'is_active',
            'masked_number', 'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'stripe_payment_method_id', 'brand', 'last4',
            'exp_month', 'exp_year', 'created_at', 'updated_at'
        ]


class PaymentMethodCreateSerializer(serializers.Serializer):
    """Serializer for creating payment methods"""
    stripe_payment_method_id = serializers.CharField()
    is_default = serializers.BooleanField(default=False)
    
    def validate_stripe_payment_method_id(self, value):
        """Validate the stripe payment method exists"""
        try:
            stripe_client = StripeClient()
            stripe_client.retrieve_payment_method(value)
        except Exception as e:
            raise serializers.ValidationError(f"Invalid Stripe payment method: {str(e)}")
        return value
    
    def create(self, validated_data):
        """Create payment method and attach to Stripe customer"""
        user = self.context['request'].user
        stripe_client = StripeClient()
        
        # Retrieve payment method details
        stripe_pm = stripe_client.retrieve_payment_method(
            validated_data['stripe_payment_method_id']
        )
        
        # Ensure user has a Stripe customer ID
        if not hasattr(user, 'payment_profile') or not user.payment_profile.stripe_customer_id:
            from users.models import UserPaymentProfile
            profile, created = UserPaymentProfile.objects.get_or_create(user=user)
            if not profile.stripe_customer_id:
                customer = stripe_client.create_customer(user)
                profile.stripe_customer_id = customer.id
                profile.save()
        
        # Attach payment method to customer
        stripe_client.attach_payment_method(
            validated_data['stripe_payment_method_id'],
            user.payment_profile.stripe_customer_id
        )
        
        # Create payment method record
        with transaction.atomic():
            # If setting as default, unset other defaults
            if validated_data.get('is_default', False):
                PaymentMethod.objects.filter(user=user, is_default=True).update(is_default=False)
            
            payment_method = PaymentMethod.objects.create(
                user=user,
                stripe_payment_method_id=validated_data['stripe_payment_method_id'],
                brand=stripe_pm.card.brand,
                last4=stripe_pm.card.last4,
                exp_month=stripe_pm.card.exp_month,
                exp_year=stripe_pm.card.exp_year,
                is_default=validated_data.get('is_default', False)
            )
        
        return payment_method


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders"""
    total_amount = serializers.ReadOnlyField()
    subtotal_amount = serializers.ReadOnlyField()
    is_paid = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'public_uuid', 'user', 'payment_method', 
            'stripe_payment_intent_id', 'stripe_payment_method_id',
            'subtotal_amount_cents', 'tax_amount_cents', 'credits_applied_cents',
            'total_amount_cents', 'subtotal_amount', 'total_amount',
            'status', 'order_type', 'currency', 'service', 'practitioner',
            'metadata', 'tax_details', 'is_paid', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'public_uuid', 'user', 'stripe_payment_intent_id',
            'created_at', 'updated_at'
        ]


class CheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating Stripe checkout sessions"""
    order_type = serializers.ChoiceField(choices=Order.ORDER_TYPE_CHOICES)
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        default='stripe'
    )
    
    # For direct service purchase
    service_id = serializers.UUIDField(required=False)
    booking_id = serializers.UUIDField(required=False)
    
    # For credit purchase
    credit_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, min_value=Decimal('1.00')
    )
    
    # For subscription
    subscription_tier_id = serializers.UUIDField(required=False)
    is_annual = serializers.BooleanField(default=False)
    
    # Options
    success_url = serializers.URLField()
    cancel_url = serializers.URLField()
    
    def validate(self, attrs):
        """Validate required fields based on order type"""
        order_type = attrs['order_type']
        
        if order_type == 'direct' and not attrs.get('service_id'):
            raise serializers.ValidationError("service_id is required for direct purchases")
        elif order_type == 'credit' and not attrs.get('credit_amount'):
            raise serializers.ValidationError("credit_amount is required for credit purchases")
        elif order_type == 'subscription' and not attrs.get('subscription_tier_id'):
            raise serializers.ValidationError("subscription_tier_id is required for subscriptions")
        
        return attrs


class UserCreditTransactionSerializer(serializers.ModelSerializer):
    """Serializer for user credit transactions"""
    amount = serializers.ReadOnlyField()
    is_credit = serializers.ReadOnlyField()
    is_debit = serializers.ReadOnlyField()
    
    class Meta:
        model = UserCreditTransaction
        fields = [
            'id', 'user', 'amount_cents', 'amount', 'transaction_type',
            'service', 'practitioner', 'order', 'booking',
            'reference_transaction', 'currency', 'exchange_rate',
            'expires_at', 'is_expired', 'description', 'metadata',
            'is_credit', 'is_debit', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class UserCreditBalanceSerializer(serializers.ModelSerializer):
    """Serializer for user credit balance"""
    balance = serializers.ReadOnlyField()
    
    class Meta:
        model = UserCreditBalance
        fields = [
            'id', 'user', 'balance_cents', 'balance', 
            'last_transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class CreditPurchaseSerializer(serializers.Serializer):
    """Serializer for purchasing credits"""
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('1.00')
    )
    payment_method_id = serializers.CharField(required=False)
    save_payment_method = serializers.BooleanField(default=False)


class CreditTransferSerializer(serializers.Serializer):
    """Serializer for transferring credits between users"""
    recipient_email = serializers.EmailField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01')
    )
    description = serializers.CharField(max_length=500, required=False)
    
    def validate_recipient_email(self, value):
        """Validate recipient exists"""
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient user not found")
        return value
    
    def validate(self, attrs):
        """Validate transfer is valid"""
        user = self.context['request'].user
        recipient = User.objects.get(email=attrs['recipient_email'])
        
        if user == recipient:
            raise serializers.ValidationError("Cannot transfer credits to yourself")
        
        # Check balance
        balance = UserCreditBalance.objects.filter(user=user).first()
        if not balance or balance.balance < attrs['amount']:
            raise serializers.ValidationError("Insufficient credit balance")
        
        return attrs


class EarningsTransactionSerializer(serializers.ModelSerializer):
    """Serializer for practitioner earnings transactions"""
    gross_amount = serializers.ReadOnlyField()
    commission_amount = serializers.ReadOnlyField()
    net_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = EarningsTransaction
        fields = [
            'id', 'practitioner', 'booking', 'gross_amount_cents',
            'commission_rate', 'commission_amount_cents', 'net_amount_cents',
            'gross_amount', 'commission_amount', 'net_amount',
            'status', 'available_after', 'payout', 'currency',
            'description', 'transaction_type', 'external_fees',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PractitionerEarningsSerializer(serializers.ModelSerializer):
    """Serializer for practitioner earnings balance"""
    pending_balance = serializers.ReadOnlyField()
    available_balance = serializers.ReadOnlyField()
    lifetime_earnings = serializers.ReadOnlyField()
    total_balance = serializers.ReadOnlyField()
    
    class Meta:
        model = PractitionerEarnings
        fields = [
            'id', 'practitioner', 'pending_balance_cents', 'available_balance_cents',
            'lifetime_earnings_cents', 'lifetime_payouts_cents',
            'pending_balance', 'available_balance', 'lifetime_earnings',
            'total_balance', 'last_payout_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'practitioner', 'created_at', 'updated_at']


class PractitionerPayoutSerializer(serializers.ModelSerializer):
    """Serializer for practitioner payouts"""
    credits_payout = serializers.ReadOnlyField()
    transaction_count = serializers.ReadOnlyField()
    
    class Meta:
        model = PractitionerPayout
        fields = [
            'id', 'practitioner', 'payout_date', 'credits_payout_cents',
            'cash_payout_cents', 'commission_collected_cents', 'credits_payout',
            'stripe_account_id', 'stripe_transfer_id', 'status', 'batch_id',
            'currency', 'processed_by', 'notes', 'payment_method',
            'error_message', 'transaction_fee_cents', 'transaction_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'practitioner', 'stripe_account_id', 'stripe_transfer_id',
            'batch_id', 'created_at', 'updated_at'
        ]


class PayoutRequestSerializer(serializers.Serializer):
    """Serializer for requesting a payout"""
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Amount to payout, or leave blank for full available balance"
    )
    notes = serializers.CharField(max_length=500, required=False)
    
    def validate_amount(self, value):
        """Validate payout amount"""
        if value and value <= 0:
            raise serializers.ValidationError("Payout amount must be positive")
        
        practitioner = self.context['request'].user.practitioner_profile
        earnings = PractitionerEarnings.objects.filter(practitioner=practitioner).first()
        
        if not earnings or earnings.available_balance < value:
            raise serializers.ValidationError("Requested amount exceeds available balance")
        
        return value


class SubscriptionTierSerializer(serializers.ModelSerializer):
    """Serializer for subscription tiers"""
    class Meta:
        model = SubscriptionTier
        fields = [
            'id', 'name', 'description', 'monthly_price', 'annual_price',
            'features', 'is_active', 'order', 'stripe_product_id',
            'stripe_monthly_price_id', 'stripe_annual_price_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PractitionerSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for practitioner subscriptions"""
    tier = SubscriptionTierSerializer(read_only=True)
    tier_id = serializers.UUIDField(write_only=True)
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = PractitionerSubscription
        fields = [
            'id', 'practitioner', 'tier', 'tier_id', 'status',
            'start_date', 'end_date', 'is_annual', 'is_active',
            'stripe_subscription_id', 'auto_renew',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'practitioner', 'stripe_subscription_id',
            'start_date', 'created_at', 'updated_at'
        ]


class SubscriptionCreateSerializer(serializers.Serializer):
    """Serializer for creating subscriptions"""
    tier_id = serializers.UUIDField()
    is_annual = serializers.BooleanField(default=False)
    payment_method_id = serializers.CharField(required=False)
    
    def validate_tier_id(self, value):
        """Validate tier exists and is active"""
        try:
            tier = SubscriptionTier.objects.get(id=value, is_active=True)
        except SubscriptionTier.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive subscription tier")
        return value


class CommissionRateSerializer(serializers.Serializer):
    """Serializer for commission rate information"""
    service_type = serializers.CharField()
    base_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    tier_adjustment = serializers.DecimalField(max_digits=5, decimal_places=2)
    effective_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    description = serializers.CharField(required=False)


class CommissionCalculationSerializer(serializers.Serializer):
    """Serializer for commission calculation"""
    gross_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_type_id = serializers.UUIDField()
    
    def validate_service_type_id(self, value):
        """Validate service type exists"""
        if not ServiceType.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid service type")
        return value


class RefundSerializer(serializers.Serializer):
    """Serializer for processing refunds"""
    order_id = serializers.UUIDField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False,
        help_text="Partial refund amount, or leave blank for full refund"
    )
    reason = serializers.CharField(max_length=500, required=False)
    refund_to_credits = serializers.BooleanField(
        default=True,
        help_text="Refund to credits (true) or original payment method (false)"
    )
    
    def validate(self, attrs):
        """Validate refund request"""
        try:
            order = Order.objects.get(id=attrs['order_id'])
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found")
        
        if order.status in ['refunded', 'failed']:
            raise serializers.ValidationError("Order cannot be refunded")
        
        if attrs.get('amount') and attrs['amount'] > order.total_amount:
            raise serializers.ValidationError("Refund amount exceeds order total")
        
        attrs['order'] = order
        return attrs


class WebhookEventSerializer(serializers.Serializer):
    """Serializer for Stripe webhook events"""
    type = serializers.CharField()
    data = serializers.JSONField()
    
    def validate_type(self, value):
        """Validate webhook event type"""
        valid_types = [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'charge.refunded',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'account.updated',
            'payout.paid',
            'payout.failed'
        ]
        if value not in valid_types:
            raise serializers.ValidationError(f"Unsupported webhook event type: {value}")
        return value