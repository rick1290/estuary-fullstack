"""
Stripe webhook router for FastAPI
"""
import stripe
import logging
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from django.conf import settings
from asgiref.sync import sync_to_async
from integrations.stripe.webhooks import (
    handle_payment_intent_succeeded,
    handle_payment_intent_failed,
    handle_checkout_session_completed,
    handle_charge_refunded,
    handle_subscription_created,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_payment_succeeded,
    handle_invoice_payment_failed,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Set Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None)
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives webhook events from Stripe and processes them
    based on the event type.
    
    Configure this URL in your Stripe dashboard:
    https://yourdomain.com/api/v1/payments/webhook
    """
    # Get the raw body
    payload = await request.body()
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
        
        # Log the event for debugging
        logger.info(f"Received Stripe webhook event: {event['type']}")
        
        # Process the event based on its type
        event_type = event['type']
        event_data = event['data']['object']
        
        # Payment events
        if event_type == 'payment_intent.succeeded':
            await sync_to_async(handle_payment_intent_succeeded)(event_data)
        elif event_type == 'payment_intent.payment_failed':
            await sync_to_async(handle_payment_intent_failed)(event_data)
        elif event_type == 'checkout.session.completed':
            await sync_to_async(handle_checkout_session_completed)(event_data)
        elif event_type == 'charge.refunded':
            await sync_to_async(handle_charge_refunded)(event_data)
        
        # Subscription events
        elif event_type == 'customer.subscription.created':
            await sync_to_async(handle_subscription_created)(event_data)
        elif event_type == 'customer.subscription.updated':
            await sync_to_async(handle_subscription_updated)(event_data)
        elif event_type == 'customer.subscription.deleted':
            await sync_to_async(handle_subscription_deleted)(event_data)
        elif event_type == 'invoice.payment_succeeded':
            await sync_to_async(handle_invoice_payment_succeeded)(event_data)
        elif event_type == 'invoice.payment_failed':
            await sync_to_async(handle_invoice_payment_failed)(event_data)
        
        else:
            logger.info(f"Unhandled event type: {event_type}")
        
        return JSONResponse(
            status_code=200,
            content={"received": True}
        )
        
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid payload: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid signature: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        # Other exceptions
        logger.exception(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/webhook/test")
async def test_webhook():
    """Test endpoint to verify webhook route is accessible"""
    return {
        "status": "ok",
        "message": "Stripe webhook endpoint is accessible",
        "endpoint": "/api/v1/payments/webhook",
        "note": "Configure this URL in your Stripe dashboard"
    }