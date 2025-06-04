import json
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone
from .models import Order, CreditTransaction, PractitionerCreditTransaction, PractitionerPayout, UserCreditBalance
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Configure Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Webhook handler for Stripe events.
    This endpoint should be registered in the Stripe dashboard.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        # Verify the event using the webhook secret
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid signature: {str(e)}")
        return HttpResponse(status=400)
    
    # Log the event type
    logger.info(f"Received Stripe webhook: {event['type']}")
    
    try:
        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            handle_payment_intent_succeeded(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            handle_payment_intent_failed(event['data']['object'])
        elif event['type'] == 'charge.refunded':
            handle_charge_refunded(event['data']['object'])
        elif event['type'] == 'payout.paid':
            handle_payout_paid(event['data']['object'])
        elif event['type'] == 'payout.failed':
            handle_payout_failed(event['data']['object'])
        # Add more event handlers as needed
    except Exception as e:
        logger.error(f"Error processing webhook {event['type']}: {str(e)}")
        # Still return 200 to acknowledge receipt (Stripe will retry otherwise)
        return HttpResponse(status=200)
    
    # Return a 200 response to acknowledge receipt of the event
    return HttpResponse(status=200)


def handle_payment_intent_succeeded(payment_intent):
    """
    Handle successful payment intent.
    Update order status and create credit transactions.
    """
    # Find the order associated with this payment intent
    try:
        order = Order.objects.get(stripe_payment_intent_id=payment_intent['id'])
        
        # Update order status
        order.status = 'completed'
        order.updated_at = timezone.now()
        
        # Update metadata
        current_metadata = order.metadata or {}
        current_metadata.update({
            'stripe_payment_status': 'succeeded',
            'payment_intent_details': {
                'id': payment_intent['id'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
                'payment_method': payment_intent['payment_method'],
                'created': payment_intent['created'],
                'status': payment_intent['status']
            }
        })
        order.metadata = current_metadata
        order.save()
        
        # Create credit transaction if applicable
        if order.service and order.user:
            CreditTransaction.objects.create(
                user=order.user,
                amount=order.amount,
                service=order.service,
                practitioner=order.practitioner,
                order=order,
                transaction_type='purchase',
                currency=order.currency,
                created_at=timezone.now()
            )
            
            # Update user credit balance
            try:
                balance, created = UserCreditBalance.objects.get_or_create(
                    user=order.user,
                    defaults={'current_balance': 0, 'currency': order.currency}
                )
                balance.update_balance()
            except Exception as e:
                logger.error(f"Error updating user credit balance: {str(e)}")
            
        # Update practitioner credit transaction if applicable
        if order.practitioner:
            try:
                # Calculate commission (could be based on practitioner's agreement)
                commission_rate = getattr(order.practitioner, 'commission_rate', 0.2)  # Default 20%
                commission = float(order.amount) * commission_rate
                net_credits = float(order.amount) - commission
                
                # Create practitioner credit transaction
                PractitionerCreditTransaction.objects.create(
                    credits_earned=order.amount,
                    commission=commission,
                    commission_rate=commission_rate,
                    net_credits=net_credits,
                    practitioner=order.practitioner,
                    payout_status='pending',
                    booking=order.booking if hasattr(order, 'booking') else None,
                    currency=order.currency,
                    created_at=timezone.now()
                )
            except Exception as e:
                logger.error(f"Error creating practitioner credit transaction: {str(e)}")
            
    except Order.DoesNotExist:
        # Log that we received a payment for an unknown order
        logger.warning(f"Payment succeeded for unknown order: {payment_intent['id']}")
    except Exception as e:
        logger.error(f"Error handling payment_intent.succeeded: {str(e)}")


def handle_payment_intent_failed(payment_intent):
    """
    Handle failed payment intent.
    Update order status.
    """
    try:
        order = Order.objects.get(stripe_payment_intent_id=payment_intent['id'])
        
        # Update order status
        order.status = 'failed'
        order.updated_at = timezone.now()
        
        # Update metadata
        current_metadata = order.metadata or {}
        current_metadata.update({
            'stripe_payment_status': 'failed',
            'payment_intent_details': {
                'id': payment_intent['id'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
                'payment_method': payment_intent.get('payment_method'),
                'created': payment_intent['created'],
                'status': payment_intent['status']
            },
            'failure_message': payment_intent.get('last_payment_error', {}).get('message', '')
        })
        order.metadata = current_metadata
        order.save()
        
    except Order.DoesNotExist:
        # Log that we received a failed payment for an unknown order
        logger.warning(f"Payment failed for unknown order: {payment_intent['id']}")
    except Exception as e:
        logger.error(f"Error handling payment_intent.payment_failed: {str(e)}")


def handle_charge_refunded(charge):
    """
    Handle refunded charge.
    Update order status and create refund credit transactions.
    """
    try:
        # Find orders that might be associated with this charge
        # First try to find by charge ID in metadata
        orders = Order.objects.filter(
            metadata__contains=json.dumps({'charge_id': charge['id']}).replace('"', '\\"')
        )
        
        # If not found, try to find by payment intent
        if not orders.exists() and charge.get('payment_intent'):
            orders = Order.objects.filter(stripe_payment_intent_id=charge['payment_intent'])
        
        if orders.exists():
            order = orders.first()
            
            # Check if it's a full or partial refund
            if charge['amount_refunded'] == charge['amount']:
                order.status = 'refunded'
            else:
                order.status = 'partially_refunded'
                
            order.updated_at = timezone.now()
            
            # Update metadata
            current_metadata = order.metadata or {}
            current_metadata.update({
                'refund_details': {
                    'charge_id': charge['id'],
                    'amount_refunded': charge['amount_refunded'],
                    'amount': charge['amount'],
                    'currency': charge['currency'],
                    'status': charge['status'],
                    'refunded': charge['refunded'],
                    'refunded_at': timezone.now().isoformat()
                }
            })
            order.metadata = current_metadata
            order.save()
            
            # Create refund credit transaction
            if order.user:
                # Convert cents to dollars if needed
                refund_amount = charge['amount_refunded'] / 100 if charge['currency'].lower() == 'usd' else charge['amount_refunded']
                
                CreditTransaction.objects.create(
                    user=order.user,
                    amount=-float(refund_amount),  # Negative amount for refund
                    service=order.service,
                    practitioner=order.practitioner,
                    order=order,
                    transaction_type='refund',
                    currency=order.currency,
                    created_at=timezone.now()
                )
                
                # Update user credit balance
                try:
                    balance = UserCreditBalance.objects.get(user=order.user)
                    balance.update_balance()
                except UserCreditBalance.DoesNotExist:
                    pass
                except Exception as e:
                    logger.error(f"Error updating user credit balance after refund: {str(e)}")
                
            # Update practitioner credit transaction if applicable
            if order.practitioner:
                try:
                    # Find related practitioner credit transactions
                    pct = PractitionerCreditTransaction.objects.filter(
                        booking=order.booking if hasattr(order, 'booking') else None
                    ).first()
                    
                    if pct:
                        # Calculate refunded amount for practitioner
                        refund_ratio = charge['amount_refunded'] / charge['amount']
                        practitioner_refund = float(pct.net_credits) * refund_ratio
                        
                        # Create a negative credit transaction
                        PractitionerCreditTransaction.objects.create(
                            credits_earned=-float(practitioner_refund),
                            commission=0,  # No commission on refunds
                            commission_rate=0,
                            net_credits=-float(practitioner_refund),
                            practitioner=order.practitioner,
                            payout_status='pending',
                            booking=order.booking if hasattr(order, 'booking') else None,
                            currency=order.currency,
                            created_at=timezone.now()
                        )
                except Exception as e:
                    logger.error(f"Error handling practitioner refund: {str(e)}")
                
    except Exception as e:
        logger.error(f"Error handling charge.refunded: {str(e)}")


def handle_payout_paid(payout):
    """
    Handle successful payout.
    Update payout status.
    """
    try:
        # Find payouts with this Stripe payout ID
        practitioner_payouts = PractitionerPayout.objects.filter(stripe_transfer_id=payout['id'])
        
        if practitioner_payouts.exists():
            for practitioner_payout in practitioner_payouts:
                practitioner_payout.status = 'completed'
                practitioner_payout.payout_date = timezone.now()
                
                # Update metadata
                current_metadata = practitioner_payout.audit_log or {}
                current_metadata.update({
                    'payout_details': {
                        'id': payout['id'],
                        'amount': payout['amount'],
                        'currency': payout['currency'],
                        'arrival_date': payout['arrival_date'],
                        'status': payout['status'],
                        'type': payout['type'],
                        'paid_at': timezone.now().isoformat()
                    }
                })
                practitioner_payout.audit_log = current_metadata
                practitioner_payout.save()
                
                # Update associated credit transactions
                PractitionerCreditTransaction.objects.filter(payout=practitioner_payout).update(
                    payout_status='paid'
                )
                
    except Exception as e:
        logger.error(f"Error handling payout.paid: {str(e)}")


def handle_payout_failed(payout):
    """
    Handle failed payout.
    Update payout status.
    """
    try:
        # Find payouts with this Stripe payout ID
        practitioner_payouts = PractitionerPayout.objects.filter(stripe_transfer_id=payout['id'])
        
        if practitioner_payouts.exists():
            for practitioner_payout in practitioner_payouts:
                practitioner_payout.status = 'failed'
                
                # Update metadata
                current_metadata = practitioner_payout.audit_log or {}
                current_metadata.update({
                    'payout_details': {
                        'id': payout['id'],
                        'amount': payout['amount'],
                        'currency': payout['currency'],
                        'failure_code': payout.get('failure_code'),
                        'failure_message': payout.get('failure_message', ''),
                        'status': payout['status'],
                        'failed_at': timezone.now().isoformat()
                    }
                })
                practitioner_payout.audit_log = current_metadata
                practitioner_payout.save()
                
                # Update associated credit transactions
                PractitionerCreditTransaction.objects.filter(payout=practitioner_payout).update(
                    payout_status='on_hold'
                )
                
    except Exception as e:
        logger.error(f"Error handling payout.failed: {str(e)}")
