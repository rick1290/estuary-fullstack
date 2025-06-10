"""
FastAPI endpoints for Stripe checkout.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from .schemas import (
    CreateCheckoutRequest,
    CheckoutSessionResponse,
    PaymentIntentRequest,
    PaymentIntentResponse,
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    CheckoutStatusRequest,
    CheckoutStatusResponse,
    ApplyCouponRequest,
    ApplyCouponResponse,
    CalculatePriceRequest,
    CalculatePriceResponse,
    ErrorResponse
)
from .services import CheckoutService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/stripe",
    tags=["stripe", "checkout"],
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    }
)


async def get_current_user(request: Request):
    """
    Get the current authenticated user from the request.
    This is a placeholder - integrate with your auth system.
    """
    # TODO: Implement actual authentication
    # For now, we'll get user from Django's session/auth
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Extract user from Django request
    if hasattr(request, 'user') and request.user.is_authenticated:
        return request.user
    
    # Try to get from session
    if hasattr(request, 'session') and '_auth_user_id' in request.session:
        try:
            user_id = request.session['_auth_user_id']
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/checkout/create", response_model=CheckoutSessionResponse)
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a checkout session for purchasing services.
    
    Supports:
    - Single session bookings
    - Bundle purchases (credits)
    - Package purchases
    """
    try:
        service = CheckoutService(current_user)
        result = await service.create_checkout_session(
            checkout_type=request.checkout_type,
            items=request.items,
            save_payment_method=request.save_payment_method,
            use_credits=request.use_credits,
            credits_to_apply=request.credits_to_apply,
            coupon_code=request.coupon_code,
            metadata=request.metadata
        )
        
        return CheckoutSessionResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error creating checkout session")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/checkout/calculate-price", response_model=CalculatePriceResponse)
async def calculate_price(
    request: CalculatePriceRequest,
    current_user = Depends(get_current_user)
):
    """
    Calculate the price for a checkout without creating a session.
    Useful for showing price preview before checkout.
    """
    try:
        service = CheckoutService(current_user)
        result = await service.calculate_pricing(
            checkout_type=request.checkout_type,
            items=request.items,
            use_credits=request.use_credits,
            credits_to_apply=request.credits_to_apply,
            coupon_code=request.coupon_code
        )
        
        return CalculatePriceResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error calculating price")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payment/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: PaymentIntentRequest,
    current_user = Depends(get_current_user)
):
    """
    Create a payment intent for an existing order.
    Used when you need more control over the payment flow.
    """
    try:
        service = CheckoutService(current_user)
        # Implementation would go here
        # For now, return placeholder
        raise HTTPException(status_code=501, detail="Not implemented yet")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error creating payment intent")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payment/confirm", response_model=ConfirmPaymentResponse)
async def confirm_payment(
    request: ConfirmPaymentRequest,
    current_user = Depends(get_current_user)
):
    """
    Confirm a payment and complete the checkout process.
    """
    try:
        service = CheckoutService(current_user)
        result = await service.confirm_payment(
            payment_intent_id=request.payment_intent_id,
            payment_method_id=request.payment_method_id
        )
        
        return ConfirmPaymentResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error confirming payment")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/checkout/status", response_model=CheckoutStatusResponse)
async def get_checkout_status(
    request: CheckoutStatusRequest,
    current_user = Depends(get_current_user)
):
    """
    Get the status of a checkout session.
    """
    try:
        service = CheckoutService(current_user)
        result = await service.get_checkout_status(
            checkout_session_id=request.checkout_session_id,
            payment_intent_id=request.payment_intent_id,
            order_id=request.order_id
        )
        
        return CheckoutStatusResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error getting checkout status")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/checkout/apply-coupon", response_model=ApplyCouponResponse)
async def apply_coupon(
    request: ApplyCouponRequest,
    current_user = Depends(get_current_user)
):
    """
    Apply a coupon to an existing order.
    """
    try:
        # TODO: Implement coupon application logic
        raise HTTPException(status_code=501, detail="Coupon system not implemented yet")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error applying coupon")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/payment-methods")
async def get_payment_methods(
    current_user = Depends(get_current_user)
):
    """
    Get saved payment methods for the current user.
    """
    try:
        from payments.models import PaymentMethod
        
        methods = PaymentMethod.objects.filter(
            user=current_user,
            is_active=True
        ).values(
            'id',
            'brand',
            'last4',
            'exp_month',
            'exp_year',
            'is_default'
        )
        
        return {"payment_methods": list(methods)}
        
    except Exception as e:
        logger.exception("Error getting payment methods")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/credits/balance")
async def get_credit_balance(
    current_user = Depends(get_current_user)
):
    """
    Get the current user's credit balance.
    """
    try:
        from payments.models import UserCreditBalance
        
        try:
            balance = UserCreditBalance.objects.get(user=current_user)
            return {
                "balance_cents": balance.balance_cents,
                "balance": float(balance.balance),
                "last_updated": balance.updated_at
            }
        except UserCreditBalance.DoesNotExist:
            return {
                "balance_cents": 0,
                "balance": 0.0,
                "last_updated": None
            }
            
    except Exception as e:
        logger.exception("Error getting credit balance")
        raise HTTPException(status_code=500, detail="Internal server error")


# Webhook endpoint (if needed)
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhooks.
    """
    try:
        # Get the webhook payload and signature
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        
        # TODO: Implement webhook handling
        # This would typically:
        # 1. Verify the webhook signature
        # 2. Process the event
        # 3. Update order/booking status
        # 4. Trigger workflows
        
        return {"status": "success"}
        
    except Exception as e:
        logger.exception("Error processing webhook")
        raise HTTPException(status_code=500, detail="Internal server error")