"""
Payment schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum

from .base import BaseSchema, ListResponse


class PaymentStatus(str, Enum):
    """Payment status options"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class OrderType(str, Enum):
    """Order type options"""
    DIRECT = "direct"
    CREDIT = "credit"
    PACKAGE = "package"
    SUBSCRIPTION = "subscription"


class PaymentMethodType(str, Enum):
    """Payment method types"""
    STRIPE = "stripe"
    CREDITS = "credits"
    MANUAL = "manual"


class TransactionType(str, Enum):
    """Credit transaction types"""
    PURCHASE = "purchase"
    USAGE = "usage"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"
    BONUS = "bonus"
    TRANSFER = "transfer"
    EXPIRY = "expiry"


class EarningsStatus(str, Enum):
    """Earnings transaction status"""
    PENDING = "pending"
    AVAILABLE = "available"
    PAID = "paid"
    REVERSED = "reversed"


class PayoutStatus(str, Enum):
    """Payout status options"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class CardBrand(str, Enum):
    """Credit card brands"""
    VISA = "visa"
    MASTERCARD = "mastercard"
    AMEX = "amex"
    DISCOVER = "discover"
    DINERS = "diners"
    JCB = "jcb"
    UNIONPAY = "unionpay"
    UNKNOWN = "unknown"


# Payment Method schemas
class PaymentMethodBase(BaseModel):
    """Base payment method schema"""
    brand: CardBrand
    last4: str = Field(..., min_length=4, max_length=4)
    exp_month: int = Field(..., ge=1, le=12)
    exp_year: int = Field(..., ge=2024)
    is_default: bool = False


class PaymentMethodCreate(BaseModel):
    """Create payment method request"""
    stripe_payment_method_id: str
    is_default: bool = False


class PaymentMethodUpdate(BaseModel):
    """Update payment method request"""
    is_default: Optional[bool] = None


class PaymentMethodResponse(PaymentMethodBase, BaseSchema):
    """Payment method response"""
    id: UUID
    stripe_payment_method_id: str
    is_active: bool
    is_expired: bool
    masked_number: str
    
    model_config = ConfigDict(from_attributes=True)


# Order schemas
class OrderCreate(BaseModel):
    """Create order request"""
    order_type: OrderType
    payment_method: PaymentMethodType = PaymentMethodType.STRIPE
    payment_method_id: Optional[str] = None
    
    # For direct service purchase
    service_id: Optional[UUID] = None
    booking_id: Optional[UUID] = None
    
    # For credit purchase
    credit_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    
    # For package/subscription
    package_id: Optional[UUID] = None
    subscription_tier_id: Optional[UUID] = None
    
    # Optional
    apply_credits: bool = False
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('payment_method_id')
    def validate_payment_method_id(cls, v, values):
        if values.get('payment_method') == PaymentMethodType.STRIPE and not v:
            raise ValueError("Payment method ID required for Stripe payments")
        return v


class OrderResponse(BaseSchema):
    """Order response"""
    id: UUID
    public_uuid: UUID
    user_id: UUID
    payment_method: PaymentMethodType
    stripe_payment_intent_id: Optional[str] = None
    
    # Amounts (in dollars, not cents)
    subtotal_amount: Decimal
    tax_amount: Decimal
    credits_applied: Decimal
    total_amount: Decimal
    
    status: PaymentStatus
    order_type: OrderType
    currency: str
    
    # Related entities
    service_id: Optional[UUID] = None
    practitioner_id: Optional[UUID] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Additional data
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tax_details: Dict[str, Any] = Field(default_factory=dict)
    
    model_config = ConfigDict(from_attributes=True)


# Credit schemas
class CreditBalance(BaseModel):
    """User credit balance"""
    balance: Decimal = Field(..., decimal_places=2)
    balance_cents: int
    last_transaction_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class CreditTransactionBase(BaseModel):
    """Base credit transaction schema"""
    amount: Decimal = Field(..., decimal_places=2)
    transaction_type: TransactionType
    description: Optional[str] = None
    
    # Related entities
    service_id: Optional[UUID] = None
    practitioner_id: Optional[UUID] = None
    order_id: Optional[UUID] = None
    booking_id: Optional[UUID] = None
    
    # Additional fields
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class CreditPurchase(BaseModel):
    """Credit purchase request"""
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method_id: str
    save_payment_method: bool = False


class CreditTransactionResponse(CreditTransactionBase, BaseSchema):
    """Credit transaction response"""
    id: UUID
    user_id: UUID
    amount_cents: int
    is_credit: bool
    is_debit: bool
    is_expired: bool
    currency: str
    reference_transaction_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CreditTransfer(BaseModel):
    """Credit transfer request"""
    recipient_user_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = None


# Earnings schemas
class PractitionerEarningsBalance(BaseSchema):
    """Practitioner earnings balance"""
    practitioner_id: UUID
    pending_balance: Decimal
    available_balance: Decimal
    lifetime_earnings: Decimal
    lifetime_payouts: Decimal
    total_balance: Decimal
    last_payout_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class EarningsTransactionResponse(BaseSchema):
    """Earnings transaction response"""
    id: UUID
    practitioner_id: UUID
    booking_id: UUID
    
    # Amounts (in dollars)
    gross_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    net_amount: Decimal
    
    # Status
    status: EarningsStatus
    available_after: datetime
    
    # Payout info
    payout_id: Optional[UUID] = None
    
    # Additional
    currency: str
    description: Optional[str] = None
    transaction_type: str
    external_fees: Optional[Dict[str, Any]] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Payout schemas
class PayoutRequest(BaseModel):
    """Request a payout"""
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Amount to payout, or None for full available balance")
    instant: bool = Field(False, description="Request instant payout (may have fees)")
    notes: Optional[str] = None


class PayoutResponse(BaseSchema):
    """Payout response"""
    id: UUID
    practitioner_id: UUID
    payout_date: Optional[datetime] = None
    
    # Amounts (in dollars)
    credits_payout: Decimal
    commission_collected: Decimal
    transaction_fee: Optional[Decimal] = None
    
    # Stripe info
    stripe_account_id: Optional[str] = None
    stripe_transfer_id: Optional[str] = None
    
    # Status
    status: PayoutStatus
    payment_method: str
    currency: str
    
    # Tracking
    batch_id: Optional[UUID] = None
    transaction_count: int
    processed_by_id: Optional[UUID] = None
    notes: Optional[str] = None
    error_message: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Subscription schemas
class SubscriptionTierResponse(BaseSchema):
    """Subscription tier details"""
    id: UUID
    name: str
    description: Optional[str] = None
    monthly_price: Decimal
    annual_price: Optional[Decimal] = None
    features: List[str] = Field(default_factory=list)
    is_active: bool
    order: int
    
    model_config = ConfigDict(from_attributes=True)


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class SubscriptionCreate(BaseModel):
    """Create subscription request"""
    tier_id: UUID
    is_annual: bool = False
    payment_method_id: str


class SubscriptionUpdate(BaseModel):
    """Update subscription request"""
    tier_id: Optional[UUID] = None
    auto_renew: Optional[bool] = None


class SubscriptionResponse(BaseSchema):
    """Subscription response"""
    id: UUID
    practitioner_id: UUID
    tier: SubscriptionTierResponse
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    is_annual: bool
    is_active: bool
    auto_renew: bool
    stripe_subscription_id: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Commission schemas
class CommissionRate(BaseModel):
    """Commission rate details"""
    service_type: str
    base_rate: Decimal
    tier_adjustment: Decimal
    effective_rate: Decimal
    description: Optional[str] = None


class CommissionCalculation(BaseModel):
    """Commission calculation result"""
    gross_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    net_amount: Decimal
    external_fees: List[Dict[str, Any]] = Field(default_factory=list)
    total_fees: Decimal
    practitioner_receives: Decimal


# Financial reports
class FinancialSummary(BaseModel):
    """Financial summary for a period"""
    period_start: datetime
    period_end: datetime
    
    # Earnings
    total_bookings: int
    gross_earnings: Decimal
    total_commission: Decimal
    total_fees: Decimal
    net_earnings: Decimal
    
    # Payouts
    total_payouts: Decimal
    pending_payouts: Decimal
    
    # By service type
    earnings_by_service_type: List[Dict[str, Any]]
    
    # Trends
    daily_earnings: List[Dict[str, Any]]


# Stripe integration
class StripePaymentIntent(BaseModel):
    """Stripe payment intent creation response"""
    client_secret: str
    payment_intent_id: str
    amount: int  # cents
    currency: str
    status: str


class StripeConnectAccount(BaseModel):
    """Stripe Connect account details"""
    account_id: str
    charges_enabled: bool
    payouts_enabled: bool
    details_submitted: bool
    verification_status: Optional[str] = None
    requirements: Optional[Dict[str, Any]] = None


class StripeAccountLink(BaseModel):
    """Stripe account onboarding link"""
    url: str
    expires_at: datetime


# List responses
class PaymentMethodListResponse(ListResponse):
    """Payment method list response"""
    results: List[PaymentMethodResponse]


class OrderListResponse(ListResponse):
    """Order list response"""
    results: List[OrderResponse]


class CreditTransactionListResponse(ListResponse):
    """Credit transaction list response"""
    results: List[CreditTransactionResponse]
    current_balance: CreditBalance


class EarningsTransactionListResponse(ListResponse):
    """Earnings transaction list response"""
    results: List[EarningsTransactionResponse]
    current_balance: PractitionerEarningsBalance


class PayoutListResponse(ListResponse):
    """Payout list response"""
    results: List[PayoutResponse]


# Refund schemas
class RefundRequest(BaseModel):
    """Refund request"""
    order_id: UUID
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, description="Partial refund amount")
    reason: Optional[str] = None
    refund_to_credits: bool = Field(True, description="Refund to credits vs original payment method")


class RefundResponse(BaseModel):
    """Refund response"""
    refund_id: str
    order_id: UUID
    amount: Decimal
    status: str
    refund_type: str  # "credits" or "payment_method"
    created_at: datetime