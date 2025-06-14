"""
Pydantic schemas for Stripe checkout API.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, UUID4
from enum import Enum


class PaymentMethodType(str, Enum):
    """Supported payment method types."""
    CARD = "card"
    LINK = "link"


class CheckoutType(str, Enum):
    """Types of checkout flows."""
    SINGLE_SESSION = "single_session"
    BUNDLE = "bundle"
    PACKAGE = "package"


class CheckoutItemBase(BaseModel):
    """Base schema for checkout items."""
    service_id: int = Field(..., description="ID of the service being purchased")
    quantity: int = Field(1, ge=1, description="Quantity to purchase")
    
    
class SessionCheckoutItem(CheckoutItemBase):
    """Schema for session checkout items."""
    practitioner_id: int = Field(..., description="ID of the practitioner")
    start_time: datetime = Field(..., description="Session start time")
    end_time: datetime = Field(..., description="Session end time")


class BundleCheckoutItem(CheckoutItemBase):
    """Schema for bundle checkout items."""
    practitioner_id: int = Field(..., description="ID of the practitioner")


class PackageCheckoutItem(CheckoutItemBase):
    """Schema for package checkout items."""
    practitioner_id: int = Field(..., description="ID of the practitioner")
    child_selections: Optional[Dict[int, Dict[str, Any]]] = Field(
        None, 
        description="Selections for package child services"
    )


class CreateCheckoutRequest(BaseModel):
    """Request schema for creating a checkout session."""
    checkout_type: CheckoutType = Field(..., description="Type of checkout")
    items: List[Any] = Field(..., description="Items to checkout")
    
    # Payment options
    save_payment_method: bool = Field(False, description="Whether to save payment method")
    use_credits: bool = Field(False, description="Whether to apply available credits")
    credits_to_apply: Optional[int] = Field(None, description="Specific amount of credits to apply in cents")
    
    # Optional fields
    coupon_code: Optional[str] = Field(None, description="Coupon code to apply")
    referral_code: Optional[str] = Field(None, description="Referral code")
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @field_validator('items')
    def validate_items(cls, v, info):
        """Validate items based on checkout type."""
        data = info.data if hasattr(info, 'data') else {}
        checkout_type = data.get('checkout_type')
        if not checkout_type:
            return v
            
        # Validate each item has the correct structure
        for item in v:
            if checkout_type == CheckoutType.SINGLE_SESSION:
                if not all(k in item for k in ['service_id', 'practitioner_id', 'start_time', 'end_time']):
                    raise ValueError("Session checkout requires service_id, practitioner_id, start_time, and end_time")
            elif checkout_type in [CheckoutType.BUNDLE, CheckoutType.PACKAGE]:
                if not all(k in item for k in ['service_id', 'practitioner_id']):
                    raise ValueError(f"{checkout_type.value} checkout requires service_id and practitioner_id")
                    
        return v


class CheckoutSessionResponse(BaseModel):
    """Response schema for checkout session creation."""
    checkout_session_id: str = Field(..., description="Stripe checkout session ID")
    payment_intent_id: Optional[str] = Field(None, description="Stripe payment intent ID")
    client_secret: Optional[str] = Field(None, description="Client secret for payment confirmation")
    
    # Order details
    order_id: UUID4 = Field(..., description="Internal order ID")
    
    # Amounts (in cents)
    subtotal_cents: int = Field(..., description="Subtotal amount in cents")
    tax_cents: int = Field(..., description="Tax amount in cents")
    credits_applied_cents: int = Field(..., description="Credits applied in cents")
    total_cents: int = Field(..., description="Total amount to charge in cents")
    
    # Additional info
    requires_payment: bool = Field(..., description="Whether payment is required")
    redirect_url: Optional[str] = Field(None, description="URL to redirect for hosted checkout")
    
    class Config:
        orm_mode = True


class PaymentIntentRequest(BaseModel):
    """Request schema for creating a payment intent."""
    order_id: UUID4 = Field(..., description="Order ID to create payment intent for")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")
    save_payment_method: bool = Field(False, description="Whether to save the payment method")
    return_url: Optional[str] = Field(None, description="URL to return to after 3DS")


class PaymentIntentResponse(BaseModel):
    """Response schema for payment intent creation."""
    payment_intent_id: str = Field(..., description="Stripe payment intent ID")
    client_secret: str = Field(..., description="Client secret for confirmation")
    status: str = Field(..., description="Payment intent status")
    requires_action: bool = Field(..., description="Whether additional action is required")
    next_action: Optional[Dict[str, Any]] = Field(None, description="Next action details if required")


class ConfirmPaymentRequest(BaseModel):
    """Request schema for confirming a payment."""
    payment_intent_id: str = Field(..., description="Stripe payment intent ID")
    payment_method_id: Optional[str] = Field(None, description="Payment method ID if not attached")


class ConfirmPaymentResponse(BaseModel):
    """Response schema for payment confirmation."""
    status: str = Field(..., description="Payment status")
    order_id: UUID4 = Field(..., description="Associated order ID")
    booking_ids: List[int] = Field(..., description="Created booking IDs")
    requires_action: bool = Field(..., description="Whether additional action is required")
    next_action: Optional[Dict[str, Any]] = Field(None, description="Next action details if required")


class CheckoutStatusRequest(BaseModel):
    """Request schema for checking checkout status."""
    checkout_session_id: Optional[str] = Field(None, description="Stripe checkout session ID")
    payment_intent_id: Optional[str] = Field(None, description="Stripe payment intent ID")
    order_id: Optional[UUID4] = Field(None, description="Internal order ID")
    
    @field_validator('checkout_session_id', 'payment_intent_id', 'order_id')
    def validate_at_least_one(cls, v, info):
        """Ensure at least one identifier is provided."""
        data = info.data if hasattr(info, 'data') else {}
        if not any([v, data.get('checkout_session_id'), data.get('payment_intent_id'), data.get('order_id')]):
            raise ValueError("At least one identifier must be provided")
        return v


class CheckoutStatusResponse(BaseModel):
    """Response schema for checkout status."""
    order_id: UUID4 = Field(..., description="Internal order ID")
    status: str = Field(..., description="Order status")
    payment_status: str = Field(..., description="Payment status")
    booking_ids: List[int] = Field(..., description="Associated booking IDs")
    created_at: datetime = Field(..., description="When checkout was created")
    completed_at: Optional[datetime] = Field(None, description="When checkout was completed")


class ApplyCouponRequest(BaseModel):
    """Request schema for applying a coupon."""
    order_id: UUID4 = Field(..., description="Order ID to apply coupon to")
    coupon_code: str = Field(..., description="Coupon code to apply")


class ApplyCouponResponse(BaseModel):
    """Response schema for coupon application."""
    success: bool = Field(..., description="Whether coupon was applied successfully")
    discount_amount_cents: int = Field(..., description="Discount amount in cents")
    new_total_cents: int = Field(..., description="New total after discount in cents")
    message: str = Field(..., description="Success or error message")


class CalculatePriceRequest(BaseModel):
    """Request schema for price calculation."""
    checkout_type: CheckoutType = Field(..., description="Type of checkout")
    items: List[Any] = Field(..., description="Items to calculate price for")
    use_credits: bool = Field(False, description="Whether to apply available credits")
    credits_to_apply: Optional[int] = Field(None, description="Specific amount of credits to apply in cents")
    coupon_code: Optional[str] = Field(None, description="Coupon code to apply")


class CalculatePriceResponse(BaseModel):
    """Response schema for price calculation."""
    subtotal_cents: int = Field(..., description="Subtotal in cents")
    tax_cents: int = Field(..., description="Tax amount in cents")
    credits_available_cents: int = Field(..., description="Available credits in cents")
    credits_applied_cents: int = Field(..., description="Credits that would be applied in cents")
    discount_cents: int = Field(..., description="Discount amount in cents")
    total_cents: int = Field(..., description="Total amount in cents")
    
    # Breakdown by item
    items: List[Dict[str, Any]] = Field(..., description="Price breakdown by item")


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    code: Optional[str] = Field(None, description="Error code")