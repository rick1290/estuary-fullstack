import json
import logging
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import datetime
import asyncio

from payments.models import (
    Order, UserCreditTransaction, PaymentMethod,
    PractitionerSubscription, SubscriptionTier,
    EarningsTransaction
)
from practitioners.models import Practitioner, PractitionerOnboardingProgress
from users.models import UserPaymentProfile
from integrations.temporal.client import get_temporal_client
from notifications.services.registry import get_client_notification_service

logger = logging.getLogger(__name__)

@csrf_exempt
def stripe_webhook_handler(request):
    """
    Handle Stripe webhook events.
    
    This endpoint receives webhook events from Stripe and processes them
    based on the event type.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        
        # Log the event for debugging
        logger.info(f"Received Stripe webhook event: {event['type']}")
        
        # Process the event based on its type
        if event['type'] == 'payment_intent.succeeded':
            handle_payment_intent_succeeded(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            handle_payment_intent_failed(event['data']['object'])
        elif event['type'] == 'checkout.session.completed':
            handle_checkout_session_completed(event['data']['object'])
        elif event['type'] == 'charge.refunded':
            handle_charge_refunded(event['data']['object'])
        
        # Subscription events
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            handle_invoice_payment_succeeded(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            handle_invoice_payment_failed(event['data']['object'])
        
        else:
            logger.info(f"Unhandled event type: {event['type']}")
        
        return HttpResponse(status=200)
        
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid payload: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid signature: {str(e)}")
        return HttpResponse(status=400)
    except Exception as e:
        # Other exceptions
        logger.exception(f"Error processing webhook: {str(e)}")
        return HttpResponse(status=500)

def handle_payment_intent_succeeded(payment_intent):
    """
    Handle a successful payment intent.
    
    Args:
        payment_intent: Stripe payment intent object
    """
    try:
        metadata = payment_intent.get('metadata', {})
        
        # Check if this is a credit purchase
        if metadata.get('type') == 'credit_purchase':
            handle_credit_purchase_succeeded(payment_intent)
            return
        
        # Get the order ID from the metadata
        order_id = metadata.get('order_id')
        if not order_id:
            logger.error(f"Payment intent {payment_intent['id']} has no order_id in metadata")
            return
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for payment intent {payment_intent['id']}")
            return
        
        # Update the order status
        order.status = 'completed'
        order.updated_at = timezone.now()
        
        # Update metadata
        metadata = order.metadata or {}
        metadata.update({
            'stripe_payment_status': 'succeeded',
            'payment_intent_details': {
                'id': payment_intent['id'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
                'status': payment_intent['status'],
                'payment_method': payment_intent.get('payment_method'),
                'payment_method_types': payment_intent.get('payment_method_types', []),
                'receipt_url': payment_intent.get('charges', {}).get('data', [{}])[0].get('receipt_url')
            }
        })
        order.metadata = metadata
        
        # Save the payment method ID if available
        if payment_intent.get('payment_method'):
            order.stripe_payment_method_id = payment_intent['payment_method']
            
            # Store the payment method in the database for future use
            store_payment_method(order.user, payment_intent.get('payment_method'))
        
        order.save()
        
        # Send payment success notification
        try:
            notification_service = get_client_notification_service()
            # Create a payment-like object from the order for the notification
            payment_data = {
                'id': order.id,
                'amount': order.amount,
                'user': order.user,
                'created_at': order.created_at,
                'stripe_receipt_url': payment_intent.get('charges', {}).get('data', [{}])[0].get('receipt_url'),
                'payment_method_display': 'Card',
                'booking': getattr(order, 'booking', None)
            }
            # Convert dict to object for the notification service
            class PaymentObj:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                def get_payment_method_display(self):
                    return self.payment_method_display
            
            payment_obj = PaymentObj(payment_data)
            notification_service.send_payment_success(payment_obj)
            logger.info(f"Sent payment success notification for order {order_id}")
        except Exception as e:
            logger.error(f"Error sending payment success notification for order {order_id}: {str(e)}")
        
        # Trigger the order processing workflow
        asyncio.create_task(trigger_order_workflow(order_id, payment_intent.get('metadata', {})))
        
        logger.info(f"Successfully processed payment intent {payment_intent['id']} for order {order_id}")
        
    except Exception as e:
        logger.exception(f"Error handling payment intent succeeded: {str(e)}")

def handle_credit_purchase_succeeded(payment_intent):
    """
    Handle a successful credit purchase payment.
    
    Args:
        payment_intent: Stripe payment intent object
    """
    try:
        metadata = payment_intent.get('metadata', {})
        user_id = metadata.get('user_id')
        credit_amount = metadata.get('credit_amount')
        
        if not user_id or not credit_amount:
            logger.error(f"Credit purchase payment intent {payment_intent['id']} missing user_id or credit_amount")
            return
        
        # Get the user
        from users.models import User
        from payments.models import UserCreditTransaction
        from decimal import Decimal
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for credit purchase")
            return
        
        # Create credit transaction
        amount_cents = int(Decimal(credit_amount) * 100)
        transaction = UserCreditTransaction.objects.create(
            user=user,
            amount_cents=amount_cents,
            transaction_type='purchase',
            description=f"Credit purchase via Stripe",
            metadata={
                'stripe_payment_intent_id': payment_intent['id'],
                'amount_paid': payment_intent['amount'],
                'currency': payment_intent['currency']
            }
        )
        
        # Send credit purchase notification
        try:
            from notifications.services.client_notifications import ClientNotificationService
            notification_service = ClientNotificationService()
            notification_service.send_credit_purchase(transaction)
            logger.info(f"Sent credit purchase notification for user {user_id}")
        except Exception as e:
            logger.error(f"Error sending credit purchase notification: {str(e)}")
        
        logger.info(f"Successfully added {credit_amount} credits to user {user_id}")
        
    except Exception as e:
        logger.exception(f"Error handling credit purchase: {str(e)}")

def handle_payment_intent_failed(payment_intent):
    """
    Handle a failed payment intent.
    
    Args:
        payment_intent: Stripe payment intent object
    """
    try:
        # Get the order ID from the metadata
        order_id = payment_intent.get('metadata', {}).get('order_id')
        if not order_id:
            logger.error(f"Payment intent {payment_intent['id']} has no order_id in metadata")
            return
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for payment intent {payment_intent['id']}")
            return
        
        # Update the order status
        order.status = 'failed'
        order.updated_at = timezone.now()
        
        # Update metadata
        metadata = order.metadata or {}
        metadata.update({
            'stripe_payment_status': 'failed',
            'payment_intent_details': {
                'id': payment_intent['id'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
                'status': payment_intent['status'],
                'last_payment_error': payment_intent.get('last_payment_error', {})
            }
        })
        order.metadata = metadata
        order.save()
        
        logger.info(f"Processed failed payment intent {payment_intent['id']} for order {order_id}")
        
    except Exception as e:
        logger.exception(f"Error handling payment intent failed: {str(e)}")

def handle_checkout_session_completed(session):
    """
    Handle a completed checkout session.
    
    Args:
        session: Stripe checkout session object
    """
    try:
        # Get the order ID from the metadata
        order_id = session.get('metadata', {}).get('order_id')
        order_type = session.get('metadata', {}).get('order_type')
        
        # Handle credit purchases without pre-existing order
        if not order_id and order_type == 'credit':
            # Create order for credit purchase
            order = Order.objects.create(
                user_id=session.get('metadata', {}).get('user_id'),
                order_type='credit',
                subtotal_amount_cents=session.get('amount_total', 0),
                total_amount_cents=session.get('amount_total', 0),
                status='completed',
                stripe_checkout_session_id=session['id'],
                stripe_payment_intent_id=session.get('payment_intent'),
                metadata={
                    'credit_amount': session.get('metadata', {}).get('credit_amount', session.get('amount_total', 0)),
                    'stripe_payment_status': 'succeeded'
                }
            )
            logger.info(f"Created order {order.id} for credit purchase from checkout session {session['id']}")
        elif order_id:
            # Get existing order
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                logger.error(f"Order {order_id} not found for checkout session {session['id']}")
                return
        else:
            logger.error(f"Checkout session {session['id']} has no order_id in metadata and is not a credit purchase")
            return
        
        # If the session has a payment intent, update the order with that ID
        if session.get('payment_intent'):
            order.stripe_payment_intent_id = session['payment_intent']
            
            # If there's a payment method, store it
            if session.get('payment_method'):
                order.stripe_payment_method_id = session['payment_method']
                
                # Store the payment method in the database for future use
                store_payment_method(order.user, session.get('payment_method'))
        
        # Update the order status
        order.status = 'completed'
        order.updated_at = timezone.now()
        
        # Update metadata
        metadata = order.metadata or {}
        metadata.update({
            'stripe_payment_status': 'succeeded',
            'checkout_session_details': {
                'id': session['id'],
                'payment_intent': session.get('payment_intent'),
                'payment_status': session.get('payment_status'),
                'customer': session.get('customer')
            }
        })
        order.metadata = metadata
        order.save()
        
        # Process based on order type
        if order.order_type == 'credit':
            # Create a credit transaction for credit purchase
            create_credit_transaction_for_order(order)
        elif order.order_type == 'direct' and order.service:
            # Create booking(s) for service purchase
            create_booking_for_order(order, session.get('metadata', {}))
        
        # Send payment success notification for checkout session
        try:
            notification_service = get_client_notification_service()
            # Create a payment-like object from the order for the notification
            payment_data = {
                'id': order.id,
                'amount': order.amount,
                'user': order.user,
                'created_at': order.created_at,
                'stripe_receipt_url': None,  # Not available in checkout session
                'payment_method_display': 'Card',
                'booking': getattr(order, 'booking', None)
            }
            # Convert dict to object for the notification service
            class PaymentObj:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                def get_payment_method_display(self):
                    return self.payment_method_display
            
            payment_obj = PaymentObj(payment_data)
            notification_service.send_payment_success(payment_obj)
            logger.info(f"Sent payment success notification for checkout session {session['id']}")
        except Exception as e:
            logger.error(f"Error sending payment success notification for checkout session {session['id']}: {str(e)}")
        
        logger.info(f"Successfully processed checkout session {session['id']} for order {order_id}")
        
    except Exception as e:
        logger.exception(f"Error handling checkout session completed: {str(e)}")

def handle_charge_refunded(charge):
    """
    Handle a refunded charge.
    
    Args:
        charge: Stripe charge object
    """
    try:
        # Get the payment intent ID
        payment_intent_id = charge.get('payment_intent')
        if not payment_intent_id:
            logger.error(f"Charge {charge['id']} has no payment_intent")
            return
        
        # Find the order with this payment intent
        try:
            order = Order.objects.get(stripe_payment_intent_id=payment_intent_id)
        except Order.DoesNotExist:
            logger.error(f"No order found for payment intent {payment_intent_id}")
            return
        
        # Check if it's a full or partial refund
        refunded_amount = charge['amount_refunded']
        total_amount = charge['amount']
        
        if refunded_amount == total_amount:
            # Full refund
            order.status = 'refunded'
        else:
            # Partial refund
            order.status = 'partially_refunded'
        
        order.updated_at = timezone.now()
        
        # Update metadata
        metadata = order.metadata or {}
        metadata.update({
            'stripe_payment_status': 'refunded' if refunded_amount == total_amount else 'partially_refunded',
            'refund_details': {
                'charge_id': charge['id'],
                'amount_refunded': refunded_amount,
                'total_amount': total_amount,
                'refund_date': timezone.now().isoformat()
            }
        })
        order.metadata = metadata
        order.save()
        
        # Create a refund credit transaction if applicable
        if order.order_type == 'credit':
            create_refund_credit_transaction(order, refunded_amount / 100)  # Convert cents to dollars
        
        # Handle any bookings associated with this order
        handle_refund_for_bookings(order, refunded_amount == total_amount)
        
        logger.info(f"Processed refund for charge {charge['id']} and order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error handling charge refunded: {str(e)}")

def create_credit_transaction_for_order(order):
    """
    Create a credit transaction for a credit purchase order.
    
    Args:
        order: Order object
    """
    try:
        # Check if credit transaction already exists for this order
        existing_transaction = UserCreditTransaction.objects.filter(
            order=order,
            transaction_type='purchase'
        ).first()
        
        if existing_transaction:
            logger.info(f"Credit transaction already exists for order {order.id}")
            return
        
        # Get credit amount from metadata or use order amount
        credit_amount = order.metadata.get('credit_amount', order.total_amount_cents) if order.metadata else order.total_amount_cents
        
        # Create a credit transaction
        UserCreditTransaction.objects.create(
            user=order.user,
            amount_cents=credit_amount,
            transaction_type='purchase',
            description=f"Credit purchase - Order #{order.id}",
            order=order
        )
        
        logger.info(f"Created credit transaction for order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error creating credit transaction for order {order.id}: {str(e)}")

def create_refund_credit_transaction(order, refunded_amount):
    """
    Create a refund credit transaction.
    
    Args:
        order: Order object
        refunded_amount: Amount refunded in cents
    """
    try:
        # Create a refund transaction (positive amount for refund to user's credit balance)
        UserCreditTransaction.objects.create(
            user=order.user,
            amount_cents=refunded_amount,  # Positive amount for refund
            transaction_type='refund',
            description=f"Refund for Order #{order.id}",
            order=order
        )
        
        logger.info(f"Created refund credit transaction for order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error creating refund credit transaction for order {order.id}: {str(e)}")

def create_booking_for_order(order, metadata):
    """
    Create booking(s) for a service purchase order based on service type.
    
    Args:
        order: Order object
        metadata: Metadata from the payment intent or checkout session
    """
    try:
        from apps.bookings.models import Booking
        from apps.services.models import Service, ServiceSession
        
        # Get service from order
        service = order.service
        if not service:
            logger.error(f"No service found for order {order.id}")
            return
        
        # Get service type
        service_type = metadata.get('service_type') or getattr(service, 'service_type', 'session')
        
        # Parse scheduling data if available
        scheduling_data = {}
        if 'scheduling_data' in metadata:
            try:
                # Try to parse JSON string
                scheduling_data = json.loads(metadata['scheduling_data'])
            except (json.JSONDecoder, TypeError):
                # If it's not a valid JSON string, use as is if it's a dict
                if isinstance(metadata['scheduling_data'], dict):
                    scheduling_data = metadata['scheduling_data']
        elif 'scheduling_data' in order.metadata:
            scheduling_data = order.metadata['scheduling_data']
        
        # Get start datetime if available
        start_datetime = None
        if 'start_datetime' in metadata:
            start_datetime = parse_datetime(metadata['start_datetime'])
        elif 'start_datetime' in scheduling_data:
            start_datetime = parse_datetime(scheduling_data['start_datetime'])
        
        # Create booking based on service type
        if service_type == 'session':
            # Create a single booking for a session
            booking = Booking.objects.create(
                user=order.user,
                service=service,
                practitioner=order.practitioner,
                start_time=start_datetime,
                status='confirmed',
                payment_status='paid',
                order=order
            )
            
            # Update order metadata with booking ID
            update_order_metadata_with_booking(order, booking)
            
            # Create paired credit transactions for service booking
            # 1. Purchase transaction (money in)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=order.subtotal_amount_cents,  # Full service price
                transaction_type='purchase',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=booking,
                description=f"Purchase: {service.name}"
            )
            
            # 2. Usage transaction (service booked)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=-order.subtotal_amount_cents,  # Negative for usage
                transaction_type='usage',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=booking,
                description=f"Booking: {service.name}"
            )
            
            # Create earnings transaction
            create_earnings_for_booking(booking, order)
            
        elif service_type == 'workshop':
            # For workshops, we need the service session ID
            service_session_id = metadata.get('service_session_id')
            if not service_session_id and 'service_session_id' in scheduling_data:
                service_session_id = scheduling_data['service_session_id']
                
            if not service_session_id:
                logger.error(f"No service_session_id found for workshop order {order.id}")
                return
                
            # Get the service session
            try:
                service_session = ServiceSession.objects.get(id=service_session_id)
            except ServiceSession.DoesNotExist:
                logger.error(f"ServiceSession {service_session_id} not found for order {order.id}")
                return
                
            # Create a booking for the workshop
            booking = Booking.objects.create(
                user=order.user,
                service=service,
                practitioner=order.practitioner,
                service_session=service_session,
                status='confirmed',
                payment_status='paid',
                order=order
            )
            
            # Add user as a participant to the service session
            add_participant_to_session(order.user, service_session)
            
            # Update order metadata with booking ID
            update_order_metadata_with_booking(order, booking)
            
            # Create paired credit transactions for service booking
            # 1. Purchase transaction (money in)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=order.subtotal_amount_cents,  # Full service price
                transaction_type='purchase',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=booking,
                description=f"Purchase: {service.name}"
            )
            
            # 2. Usage transaction (service booked)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=-order.subtotal_amount_cents,  # Negative for usage
                transaction_type='usage',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=booking,
                description=f"Booking: {service.name}"
            )
            
            # Create earnings transaction
            create_earnings_for_booking(booking, order)
            
        elif service_type in ['package', 'bundle']:
            # Create a parent booking for the package/bundle
            parent_booking = Booking.objects.create(
                user=order.user,
                service=service,
                practitioner=order.practitioner,
                status='confirmed',
                payment_status='paid',
                order=order
            )
            
            # Create child bookings for each service in the package
            # This would require knowledge of what services are in the package
            # For now, we'll just create the parent booking
            
            # Update order metadata with booking ID
            update_order_metadata_with_booking(order, parent_booking)
            
            # Create paired credit transactions for service booking
            # 1. Purchase transaction (money in)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=order.subtotal_amount_cents,  # Full service price
                transaction_type='purchase',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=parent_booking,
                description=f"Purchase: {service.name}"
            )
            
            # 2. Usage transaction (service booked)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=-order.subtotal_amount_cents,  # Negative for usage
                transaction_type='usage',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=parent_booking,
                description=f"Booking: {service.name}"
            )
            
            # Create earnings transaction for the parent booking
            create_earnings_for_booking(parent_booking, order)
            
        elif service_type == 'course':
            # For courses, we need to create a parent booking and add the user to all sessions
            
            # Create a parent booking for the course
            parent_booking = Booking.objects.create(
                user=order.user,
                service=service,
                practitioner=order.practitioner,
                status='confirmed',
                payment_status='paid',
                order=order
            )
            
            # Get all service sessions for this course
            service_sessions = ServiceSession.objects.filter(service=service)
            
            # Add user as a participant to all service sessions
            for session in service_sessions:
                add_participant_to_session(order.user, session)
                
                # Create a child booking for each session
                Booking.objects.create(
                    user=order.user,
                    service=service,
                    practitioner=order.practitioner,
                    service_session=session,
                    status='confirmed',
                    payment_status='paid',
                    order=order,
                    parent_booking=parent_booking
                )
            
            # Update order metadata with booking ID
            update_order_metadata_with_booking(order, parent_booking)
            
            # Create paired credit transactions for service booking
            # 1. Purchase transaction (money in)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=order.subtotal_amount_cents,  # Full service price
                transaction_type='purchase',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=parent_booking,
                description=f"Purchase: {service.name}"
            )
            
            # 2. Usage transaction (service booked)
            UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=-order.subtotal_amount_cents,  # Negative for usage
                transaction_type='usage',
                service=service,
                practitioner=order.practitioner,
                order=order,
                booking=parent_booking,
                description=f"Booking: {service.name}"
            )
            
            # Create earnings transaction for the parent booking
            create_earnings_for_booking(parent_booking, order)
            
        else:
            logger.warning(f"Unknown service type '{service_type}' for order {order.id}")
            
        logger.info(f"Created booking(s) for order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error creating booking for order {order.id}: {str(e)}")

def update_order_metadata_with_booking(order, booking):
    """
    Update order metadata with booking ID.
    
    Args:
        order: Order object
        booking: Booking object
    """
    try:
        metadata = order.metadata or {}
        metadata['booking_id'] = str(booking.id)
        order.metadata = metadata
        order.save(update_fields=['metadata'])
    except Exception as e:
        logger.exception(f"Error updating order metadata with booking: {str(e)}")

def add_participant_to_session(user, service_session):
    """
    Add a user as a participant to a service session.
    
    Args:
        user: User object
        service_session: ServiceSession object
    """
    try:
        from apps.services.models import SessionParticipant
        
        # Check if user is already a participant
        existing = SessionParticipant.objects.filter(
            user=user,
            service_session=service_session
        ).exists()
        
        if not existing:
            # Create a new participant record
            SessionParticipant.objects.create(
                user=user,
                service_session=service_session,
                status='confirmed',
                attended=False  # Will be updated after the session
            )
            
        logger.info(f"Added user {user.id} as participant to session {service_session.id}")
        
    except Exception as e:
        logger.exception(f"Error adding participant to session: {str(e)}")

def handle_refund_for_bookings(order, is_full_refund):
    """
    Handle refunds for bookings associated with an order.
    
    Args:
        order: Order object
        is_full_refund: Whether this is a full refund
    """
    try:
        from apps.bookings.models import Booking
        
        # Find all bookings associated with this order
        bookings = Booking.objects.filter(order=order)
        
        for booking in bookings:
            if is_full_refund:
                # For full refunds, cancel the booking
                booking.status = 'cancelled'
                booking.payment_status = 'refunded'
            else:
                # For partial refunds, mark as partially refunded
                booking.payment_status = 'partially_refunded'
                
            booking.save()
            
            # If this is a parent booking, update all child bookings
            if hasattr(booking, 'child_bookings'):
                child_bookings = booking.child_bookings.all()
                for child in child_bookings:
                    if is_full_refund:
                        child.status = 'cancelled'
                        child.payment_status = 'refunded'
                    else:
                        child.payment_status = 'partially_refunded'
                    child.save()
            
        logger.info(f"Updated {bookings.count()} bookings for refunded order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error handling refund for bookings: {str(e)}")

def store_payment_method(user, payment_method_id):
    """
    Store a payment method for future use.
    
    Args:
        user: User model instance
        payment_method_id: Stripe payment method ID
    """
    try:
        # Import here to avoid circular imports
        from apps.payments.models import PaymentMethod
        
        # Check if this payment method is already stored
        existing = PaymentMethod.objects.filter(
            user=user,
            stripe_payment_method_id=payment_method_id
        ).exists()
        
        if not existing:
            # Get payment method details from Stripe
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            
            # Extract card details
            card = payment_method.get('card', {})
            card_brand = card.get('brand', '')
            last4 = card.get('last4', '')
            exp_month = card.get('exp_month')
            exp_year = card.get('exp_year')
            
            # Create a new payment method record
            PaymentMethod.objects.create(
                user=user,
                stripe_payment_method_id=payment_method_id,
                card_brand=card_brand,
                last4=last4,
                exp_month=exp_month,
                exp_year=exp_year,
                is_default=not PaymentMethod.objects.filter(user=user).exists()  # Make default if first card
            )
            
            logger.info(f"Stored payment method {payment_method_id} for user {user.id}")
            
    except Exception as e:
        logger.exception(f"Error storing payment method: {str(e)}")

def parse_datetime(datetime_str):
    """
    Parse a datetime string to a datetime object.
    
    Args:
        datetime_str: Datetime string in ISO format
        
    Returns:
        datetime object or None if parsing fails
    """
    if not datetime_str:
        return None
        
    try:
        # Try parsing ISO format
        return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        try:
            # Try parsing with dateutil
            from dateutil import parser
            return parser.parse(datetime_str)
        except:
            logger.error(f"Could not parse datetime string: {datetime_str}")
            return None

def create_earnings_for_booking(booking, order):
    """
    Create earnings transaction for a booking.
    
    Args:
        booking: Booking object
        order: Order object
    """
    try:
        if not booking.practitioner:
            logger.info(f"No practitioner for booking {booking.id}, skipping earnings creation")
            return
        
        # Get commission calculator
        from payments.commission_services import CommissionCalculator
        calculator = CommissionCalculator()
        
        # Get commission rate
        commission_rate = calculator.get_commission_rate(
            practitioner=booking.practitioner,
            service_type=booking.service.service_type
        )
        
        # Calculate commission and net amounts
        gross_amount_cents = booking.price_charged_cents
        commission_amount_cents = int((commission_rate / 100) * gross_amount_cents)
        net_amount_cents = gross_amount_cents - commission_amount_cents
        
        # Create earnings transaction with 'projected' status
        earnings = EarningsTransaction.objects.create(
            practitioner=booking.practitioner,
            booking=booking,
            gross_amount_cents=gross_amount_cents,
            commission_rate=commission_rate,
            commission_amount_cents=commission_amount_cents,
            net_amount_cents=net_amount_cents,
            status='projected',  # Will become 'pending' when booking starts
            available_after=booking.start_time + timezone.timedelta(hours=48),
            description=f"Earnings from booking for {booking.service.name}"
        )
        
        logger.info(f"Created earnings transaction {earnings.id} for booking {booking.id}")
        
    except Exception as e:
        logger.exception(f"Error creating earnings for booking {booking.id}: {str(e)}")


async def trigger_order_workflow(order_id: str, metadata: dict):
    """
    Trigger the order processing workflow via Temporal.
    
    Args:
        order_id: Order ID
        metadata: Additional metadata from payment
    """
    try:
        client = await get_temporal_client()
        
        # Extract booking details from metadata if available
        booking_details = None
        if 'booking_details' in metadata:
            booking_details = metadata['booking_details']
        elif 'start_time' in metadata:
            # Build booking details from individual fields
            booking_details = {
                'start_time': metadata.get('start_time'),
                'end_time': metadata.get('end_time'),
                'duration_minutes': metadata.get('duration_minutes', 60),
                'location_type': metadata.get('location_type', 'online'),
                'notes': metadata.get('notes', '')
            }
        
        # Start the workflow
        handle = await client.start_workflow(
            "OrderProcessingWorkflow",
            args=[order_id, booking_details],
            id=f"order-processing-{order_id}",
            task_queue="payment"
        )
        
        logger.info(f"Started OrderProcessingWorkflow for order {order_id}")
        
    except Exception as e:
        logger.error(f"Error triggering order workflow: {e}")
        # Don't raise - we don't want webhook to fail


# Subscription webhook handlers
def handle_subscription_created(subscription):
    """
    Handle a newly created subscription.
    
    Args:
        subscription: Stripe subscription object
    """
    try:
        # Get practitioner ID from metadata
        practitioner_id = subscription.get('metadata', {}).get('practitioner_id')
        if not practitioner_id:
            logger.error(f"Subscription {subscription['id']} has no practitioner_id in metadata")
            return
        
        # Get tier ID from metadata
        tier_id = subscription.get('metadata', {}).get('tier_id')
        if not tier_id:
            logger.error(f"Subscription {subscription['id']} has no tier_id in metadata")
            return
        
        # Get the practitioner and tier
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
            tier = SubscriptionTier.objects.get(id=tier_id)
        except (Practitioner.DoesNotExist, SubscriptionTier.DoesNotExist) as e:
            logger.error(f"Practitioner or Tier not found: {str(e)}")
            return
        
        # Create or update the subscription record
        practitioner_sub, created = PractitionerSubscription.objects.update_or_create(
            practitioner=practitioner,
            defaults={
                'tier': tier,
                'status': subscription['status'],
                'stripe_subscription_id': subscription['id'],
                'start_date': timezone.make_aware(datetime.fromtimestamp(subscription['current_period_start'])),
                'end_date': timezone.make_aware(datetime.fromtimestamp(subscription['current_period_end'])),
                'is_annual': subscription['items']['data'][0]['plan']['interval'] == 'year',
                'auto_renew': not subscription.get('cancel_at_period_end', False)
            }
        )
        
        # Update onboarding progress
        onboarding, _ = PractitionerOnboardingProgress.objects.get_or_create(
            practitioner=practitioner
        )
        onboarding.subscription_setup = True
        onboarding.save()
        
        # Trigger subscription workflow
        asyncio.create_task(trigger_subscription_workflow(
            practitioner_id, 
            'created', 
            {'tier_name': tier.name, 'subscription_id': subscription['id']}
        ))
        
        logger.info(f"Successfully processed subscription creation for practitioner {practitioner_id}")
        
    except Exception as e:
        logger.exception(f"Error handling subscription created: {str(e)}")


def handle_subscription_updated(subscription):
    """
    Handle a subscription update (upgrade/downgrade/renewal).
    
    Args:
        subscription: Stripe subscription object
    """
    try:
        # Find the subscription by Stripe ID
        try:
            practitioner_sub = PractitionerSubscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
        except PractitionerSubscription.DoesNotExist:
            logger.error(f"No PractitionerSubscription found for Stripe ID {subscription['id']}")
            return
        
        # Check if tier changed
        tier_changed = False
        new_tier = None
        if 'tier_id' in subscription.get('metadata', {}):
            new_tier_id = subscription['metadata']['tier_id']
            try:
                new_tier = SubscriptionTier.objects.get(id=new_tier_id)
                if new_tier != practitioner_sub.tier:
                    tier_changed = True
                    practitioner_sub.tier = new_tier
            except SubscriptionTier.DoesNotExist:
                logger.error(f"Tier {new_tier_id} not found")
        
        # Update subscription details
        practitioner_sub.status = subscription['status']
        practitioner_sub.auto_renew = not subscription.get('cancel_at_period_end', False)
        practitioner_sub.is_annual = subscription['items']['data'][0]['plan']['interval'] == 'year'
        
        # Update period dates
        if subscription.get('current_period_start'):
            practitioner_sub.start_date = timezone.make_aware(
                datetime.fromtimestamp(subscription['current_period_start'])
            )
        if subscription.get('current_period_end'):
            practitioner_sub.end_date = timezone.make_aware(
                datetime.fromtimestamp(subscription['current_period_end'])
            )
        
        practitioner_sub.save()
        
        # Trigger workflow for tier changes
        if tier_changed:
            asyncio.create_task(trigger_subscription_workflow(
                str(practitioner_sub.practitioner_id),
                'tier_changed',
                {
                    'old_tier': practitioner_sub.tier.name,
                    'new_tier': new_tier.name if new_tier else 'Unknown',
                    'subscription_id': subscription['id']
                }
            ))
        
        logger.info(f"Successfully processed subscription update for {subscription['id']}")
        
    except Exception as e:
        logger.exception(f"Error handling subscription updated: {str(e)}")


def handle_subscription_deleted(subscription):
    """
    Handle a subscription cancellation/deletion.
    
    Args:
        subscription: Stripe subscription object
    """
    try:
        # Find the subscription by Stripe ID
        try:
            practitioner_sub = PractitionerSubscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
        except PractitionerSubscription.DoesNotExist:
            logger.error(f"No PractitionerSubscription found for Stripe ID {subscription['id']}")
            return
        
        # Update subscription status
        practitioner_sub.status = 'canceled'
        practitioner_sub.auto_renew = False
        
        # Set end date if not already set
        if subscription.get('ended_at'):
            practitioner_sub.end_date = timezone.make_aware(
                datetime.fromtimestamp(subscription['ended_at'])
            )
        elif subscription.get('current_period_end'):
            # Will be active until period end
            practitioner_sub.end_date = timezone.make_aware(
                datetime.fromtimestamp(subscription['current_period_end'])
            )
        
        practitioner_sub.save()
        
        # Trigger cancellation workflow
        asyncio.create_task(trigger_subscription_workflow(
            str(practitioner_sub.practitioner_id),
            'canceled',
            {
                'tier_name': practitioner_sub.tier.name,
                'subscription_id': subscription['id'],
                'end_date': practitioner_sub.end_date.isoformat() if practitioner_sub.end_date else None
            }
        ))
        
        logger.info(f"Successfully processed subscription deletion for {subscription['id']}")
        
    except Exception as e:
        logger.exception(f"Error handling subscription deleted: {str(e)}")


def handle_invoice_payment_succeeded(invoice):
    """
    Handle successful subscription invoice payment.
    
    Args:
        invoice: Stripe invoice object
    """
    try:
        # Only process subscription invoices
        if not invoice.get('subscription'):
            return
        
        # Find the subscription
        try:
            practitioner_sub = PractitionerSubscription.objects.get(
                stripe_subscription_id=invoice['subscription']
            )
        except PractitionerSubscription.DoesNotExist:
            logger.warning(f"No PractitionerSubscription found for invoice {invoice['id']}")
            return
        
        # Update subscription status to active if it was past_due
        if practitioner_sub.status == 'past_due':
            practitioner_sub.status = 'active'
            practitioner_sub.save()
        
        # Log successful payment
        logger.info(f"Subscription invoice {invoice['id']} paid successfully")
        
        # Trigger payment success workflow
        asyncio.create_task(trigger_subscription_workflow(
            str(practitioner_sub.practitioner_id),
            'payment_succeeded',
            {
                'invoice_id': invoice['id'],
                'amount': invoice['amount_paid'] / 100,  # Convert from cents
                'subscription_id': invoice['subscription']
            }
        ))
        
    except Exception as e:
        logger.exception(f"Error handling invoice payment succeeded: {str(e)}")


def handle_invoice_payment_failed(invoice):
    """
    Handle failed subscription invoice payment.
    
    Args:
        invoice: Stripe invoice object
    """
    try:
        # Only process subscription invoices
        if not invoice.get('subscription'):
            return
        
        # Find the subscription
        try:
            practitioner_sub = PractitionerSubscription.objects.get(
                stripe_subscription_id=invoice['subscription']
            )
        except PractitionerSubscription.DoesNotExist:
            logger.warning(f"No PractitionerSubscription found for invoice {invoice['id']}")
            return
        
        # Update subscription status
        practitioner_sub.status = 'past_due'
        practitioner_sub.save()
        
        # Log payment failure
        logger.warning(f"Subscription invoice {invoice['id']} payment failed")
        
        # Trigger payment failure workflow
        asyncio.create_task(trigger_subscription_workflow(
            str(practitioner_sub.practitioner_id),
            'payment_failed',
            {
                'invoice_id': invoice['id'],
                'amount': invoice['amount_due'] / 100,  # Convert from cents
                'subscription_id': invoice['subscription'],
                'attempt_count': invoice.get('attempt_count', 1)
            }
        ))
        
    except Exception as e:
        logger.exception(f"Error handling invoice payment failed: {str(e)}")


async def trigger_subscription_workflow(practitioner_id: str, event_type: str, metadata: dict):
    """
    Trigger subscription-related workflows via Temporal.
    
    Args:
        practitioner_id: Practitioner ID
        event_type: Type of subscription event
        metadata: Additional event metadata
    """
    try:
        client = await get_temporal_client()
        
        # Start the workflow
        handle = await client.start_workflow(
            "PractitionerSubscriptionWorkflow",
            args=[practitioner_id, event_type, metadata],
            id=f"subscription-{event_type}-{practitioner_id}-{timezone.now().timestamp()}",
            task_queue="subscriptions"
        )
        
        logger.info(f"Started PractitionerSubscriptionWorkflow for {event_type} event")
        
    except Exception as e:
        logger.error(f"Error triggering subscription workflow: {e}")
        # Don't raise - we don't want webhook to fail
