import json
import logging
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import datetime

from apps.payments.models import Order, CreditTransaction, PaymentMethod

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
        
        # Process based on order type
        if order.order_type == 'credit':
            # Create a credit transaction for credit purchase
            create_credit_transaction_for_order(order)
        elif order.order_type == 'direct' and order.service:
            # Create booking(s) for service purchase
            create_booking_for_order(order, payment_intent.get('metadata', {}))
        
        logger.info(f"Successfully processed payment intent {payment_intent['id']} for order {order_id}")
        
    except Exception as e:
        logger.exception(f"Error handling payment intent succeeded: {str(e)}")

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
        if not order_id:
            logger.error(f"Checkout session {session['id']} has no order_id in metadata")
            return
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found for checkout session {session['id']}")
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
        # Get credit amount from metadata or use order amount
        credit_amount = order.metadata.get('credit_amount', order.amount) if order.metadata else order.amount
        
        # Create a credit transaction
        CreditTransaction.objects.create(
            user=order.user,
            amount=credit_amount,
            created_at=timezone.now(),
            updated_at=timezone.now(),
            order=order,
            transaction_type='purchase',
            currency=order.currency
        )
        
        logger.info(f"Created credit transaction for order {order.id}")
        
    except Exception as e:
        logger.exception(f"Error creating credit transaction for order {order.id}: {str(e)}")

def create_refund_credit_transaction(order, refunded_amount):
    """
    Create a refund credit transaction.
    
    Args:
        order: Order object
        refunded_amount: Amount refunded
    """
    try:
        # Find the original purchase transaction
        original_transaction = CreditTransaction.objects.filter(
            order=order,
            transaction_type='purchase'
        ).first()
        
        # Create a refund transaction
        CreditTransaction.objects.create(
            user=order.user,
            amount=-float(refunded_amount),  # Negative amount for refund
            created_at=timezone.now(),
            updated_at=timezone.now(),
            order=order,
            transaction_type='refund',
            reference_transaction=original_transaction,
            currency=order.currency
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
