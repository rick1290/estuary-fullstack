from rest_framework import serializers
from apps.payments.models import (
    Order, CreditTransaction, PaymentMethod, 
    PractitionerCreditTransaction, PractitionerPayout, UserCreditBalance
)
from apps.users.api.v1.serializers import UserBasicSerializer
from apps.services.api.v1.serializers import ServiceBasicSerializer
from apps.practitioners.api.v1.serializers import PractitionerBasicSerializer
from apps.bookings.api.v1.serializers import BookingBasicSerializer
from drf_spectacular.utils import extend_schema_field


class OrderSerializer(serializers.ModelSerializer):
    """
    Serializer for Order model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    service_details = ServiceBasicSerializer(source='service', read_only=True)
    practitioner_details = PractitionerBasicSerializer(source='practitioner', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'method', 'stripe_payment_intent_id', 'amount',
            'status', 'created_at', 'updated_at', 'service', 'practitioner',
            'stripe_payment_method_id', 'metadata', 'credits_applied',
            'order_type', 'tax_amount', 'tax_details', 'currency',
            'user_details', 'service_details', 'practitioner_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrderCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating orders.
    """
    class Meta:
        model = Order
        fields = [
            'user', 'method', 'amount', 'service', 'practitioner',
            'stripe_payment_method_id', 'metadata', 'credits_applied',
            'order_type', 'tax_amount', 'tax_details', 'currency'
        ]


class CreditTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for CreditTransaction model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    service_details = ServiceBasicSerializer(source='service', read_only=True)
    practitioner_details = PractitionerBasicSerializer(source='practitioner', read_only=True)
    order_details = OrderSerializer(source='order', read_only=True)
    
    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'user', 'amount', 'created_at', 'updated_at', 'service',
            'practitioner', 'initial_booking_date', 'order', 'transaction_type',
            'reference_transaction', 'currency', 'exchange_rate', 'expires_at',
            'is_expired', 'user_details', 'service_details', 'practitioner_details',
            'order_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreditTransactionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating credit transactions.
    """
    class Meta:
        model = CreditTransaction
        fields = [
            'user', 'amount', 'service', 'practitioner', 'initial_booking_date',
            'order', 'transaction_type', 'reference_transaction', 'currency',
            'exchange_rate', 'expires_at'
        ]


class PaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for PaymentMethod model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'created_at', 'user', 'stripe_payment_id', 'brand',
            'last4', 'exp_month', 'exp_year', 'is_default', 'is_deleted',
            'metadata', 'user_details'
        ]
        read_only_fields = ['id', 'created_at', 'brand', 'last4', 'exp_month', 'exp_year']


class PaymentMethodCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating payment methods.
    """
    class Meta:
        model = PaymentMethod
        fields = [
            'user', 'stripe_payment_id', 'is_default', 'metadata'
        ]


class PractitionerCreditTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for PractitionerCreditTransaction model.
    """
    practitioner_details = PractitionerBasicSerializer(source='practitioner', read_only=True)
    booking_details = BookingBasicSerializer(source='booking', read_only=True)
    payout_details = serializers.SerializerMethodField()
    
    class Meta:
        model = PractitionerCreditTransaction
        fields = [
            'id', 'created_at', 'credits_earned', 'commission', 'commission_rate',
            'net_credits', 'practitioner', 'payout_status', 'payout', 'booking',
            'currency', 'practitioner_details', 'booking_details', 'payout_details'
        ]
        read_only_fields = ['id', 'created_at']
    
    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_payout_details(self, obj):
        if obj.payout:
            return {
                'id': obj.payout.id,
                'payout_date': obj.payout.payout_date,
                'status': obj.payout.status
            }
        return None


class PractitionerPayoutSerializer(serializers.ModelSerializer):
    """
    Serializer for PractitionerPayout model.
    """
    practitioner_details = PractitionerBasicSerializer(source='practitioner', read_only=True)
    transactions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PractitionerPayout
        fields = [
            'id', 'created_at', 'practitioner', 'payout_date', 'credits_payout',
            'cash_payout', 'commission_collected', 'stripe_account_id',
            'stripe_transfer_id', 'status', 'batch_id', 'currency',
            'payment_method', 'notes', 'practitioner_details', 'transactions_count'
        ]
        read_only_fields = ['id', 'created_at', 'stripe_transfer_id']
    
    @extend_schema_field(serializers.IntegerField())
    def get_transactions_count(self, obj):
        return obj.practitionercredittransaction_set.count()


class UserCreditBalanceSerializer(serializers.ModelSerializer):
    """
    Serializer for UserCreditBalance model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = UserCreditBalance
        fields = [
            'id', 'user', 'balance', 'updated_at',
            'user_details'
        ]
        read_only_fields = ['id', 'updated_at']
