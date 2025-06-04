import logging
from decimal import Decimal
from django.utils import timezone
from .client import StripeClient
from django.conf import settings
import json

logger = logging.getLogger(__name__)

def create_stripe_customer(user):
    """
    Create a Stripe customer for a user and store the ID.
    
    Args:
        user: User model instance
        
    Returns:
        str: Stripe customer ID
    """
    try:
        # Check if user already has a Stripe customer ID
        if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
            return user.stripe_customer_id
            
        # Create metadata with user ID for reference
        metadata = {
            'user_id': str(user.id),
            'is_practitioner': 'true' if hasattr(user, 'is_practitioner') and user.is_practitioner else 'false'
        }
        
        # Create the customer in Stripe
        customer = StripeClient.create_customer(user, metadata=metadata)
        
        # Store the customer ID on the user model
        if hasattr(user, 'stripe_customer_id'):
            user.stripe_customer_id = customer['id']
            user.save(update_fields=['stripe_customer_id'])
            
        return customer['id']
        
    except Exception as e:
        logger.exception(f"Error creating Stripe customer for user {user.id}: {str(e)}")
        raise

def format_amount_for_stripe(amount):
    """
    Convert a decimal amount to cents for Stripe.
    
    Args:
        amount (Decimal or float): Amount in dollars
        
    Returns:
        int: Amount in cents
    """
    # Convert to Decimal if not already
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
        
    # Convert to cents and round to nearest cent
    return int(amount * 100)

def create_order_for_booking_data(user, service, amount, service_data=None, scheduling_data=None):
    """
    Create an Order record for booking data before payment.
    
    Args:
        user: User model instance
        service: Service model instance
        amount: Amount to charge
        service_data: Additional service data (optional)
        scheduling_data: Scheduling information (optional)
        
    Returns:
        Order: The created order
    """
    from apps.payments.models import Order
    
    try:
        # Create metadata for the order
        metadata = {}
        
        # Add service data
        if service_data:
            metadata.update(service_data)
            
        # Add scheduling data
        if scheduling_data:
            # Convert datetime objects to ISO format strings
            for key in scheduling_data:
                if hasattr(scheduling_data[key], 'isoformat'):
                    scheduling_data[key] = scheduling_data[key].isoformat()
            metadata['scheduling_data'] = scheduling_data
        
        # Get practitioner from service if available
        practitioner = None
        if hasattr(service, 'practitioner'):
            practitioner = service.practitioner
        
        # Create the order
        order = Order.objects.create(
            user=user,
            service=service,
            practitioner=practitioner,
            amount=float(amount),
            status='pending',
            created_at=timezone.now(),
            updated_at=timezone.now(),
            order_type='direct',
            currency='USD',  # Adjust based on your requirements
            metadata=metadata
        )
            
        return order
        
    except Exception as e:
        logger.exception(f"Error creating order for service {service.id}: {str(e)}")
        raise

def create_order_for_credit_purchase(user, amount, credit_amount=None):
    """
    Create an Order record for a credit purchase.
    
    Args:
        user: User model instance
        amount: Amount to charge
        credit_amount: Amount of credits to purchase (optional, defaults to amount)
        
    Returns:
        Order: The created order
    """
    from apps.payments.models import Order
    
    try:
        # If credit_amount is not specified, use the amount
        if credit_amount is None:
            credit_amount = amount
        
        # Create the order
        order = Order.objects.create(
            user=user,
            amount=float(amount),
            status='pending',
            created_at=timezone.now(),
            updated_at=timezone.now(),
            order_type='credit',
            currency='USD',  # Adjust based on your requirements
            metadata={
                'credit_amount': float(credit_amount)
            }
        )
            
        return order
        
    except Exception as e:
        logger.exception(f"Error creating order for credit purchase: {str(e)}")
        raise

def create_payment_metadata(order, additional_data=None):
    """
    Create minimal metadata for Stripe payments.
    
    Args:
        order: Order model instance
        additional_data: Any additional data to include in metadata
        
    Returns:
        dict: Metadata for Stripe
    """
    metadata = {
        'order_id': str(order.id),
        'user_id': str(order.user.id),
        'order_type': order.order_type
    }
    
    # For direct service purchases
    if order.order_type == 'direct' and order.service:
        metadata['service_id'] = str(order.service.id)
        
        # Add service type if available
        if hasattr(order.service, 'service_type'):
            metadata['service_type'] = order.service.service_type
            
        # Include service name for better readability in Stripe dashboard
        metadata['service_name'] = order.service.name
    
    # Add any existing metadata from the order
    if order.metadata:
        # For service sessions (workshops)
        if 'service_session_id' in order.metadata:
            metadata['service_session_id'] = order.metadata['service_session_id']
            
        # For scheduling data
        if 'scheduling_data' in order.metadata:
            # If it's a dict, convert to JSON string
            if isinstance(order.metadata['scheduling_data'], dict):
                metadata['scheduling_data'] = json.dumps(order.metadata['scheduling_data'])
            else:
                metadata['scheduling_data'] = order.metadata['scheduling_data']
    
    # Add any additional data
    if additional_data:
        metadata.update(additional_data)
        
    return metadata

def create_payment_intent_for_order(order, additional_metadata=None):
    """
    Create a Stripe payment intent for an order.
    
    Args:
        order: Order model instance
        additional_metadata: Additional metadata to include (optional)
        
    Returns:
        dict: Payment intent data including client_secret
    """
    try:
        # Get or create Stripe customer
        customer_id = create_stripe_customer(order.user)
        
        # Calculate the amount in cents
        amount = format_amount_for_stripe(order.amount)
        
        # Create metadata for the payment intent
        metadata = create_payment_metadata(order, additional_metadata)
            
        # Create the payment intent
        payment_intent = StripeClient.create_payment_intent(
            amount=amount,
            currency=order.currency.lower(),
            customer_id=customer_id,
            metadata=metadata,
            payment_method_types=['card'],  # Adjust based on your requirements
            setup_future_usage='off_session'  # Enable saving payment method for future use
        )
        
        # Update the order with the payment intent ID
        order.stripe_payment_intent_id = payment_intent['id']
        order.status = 'pending'
        order.updated_at = timezone.now()
        
        # Update metadata
        current_metadata = order.metadata or {}
        current_metadata.update({
            'stripe_payment_status': 'created',
            'payment_intent_details': {
                'id': payment_intent['id'],
                'amount': payment_intent['amount'],
                'currency': payment_intent['currency'],
                'created': payment_intent['created'],
                'status': payment_intent['status']
            }
        })
        order.metadata = current_metadata
        order.save()
        
        return {
            'id': payment_intent['id'],
            'client_secret': payment_intent['client_secret'],
            'amount': amount,
            'currency': payment_intent['currency']
        }
        
    except Exception as e:
        logger.exception(f"Error creating payment intent for order {order.id}: {str(e)}")
        raise

def create_checkout_session_for_order(order, success_url=None, cancel_url=None, additional_metadata=None):
    """
    Create a Stripe Checkout Session for an order.
    
    Args:
        order: Order model instance
        success_url: URL to redirect after successful payment (optional)
        cancel_url: URL to redirect after cancelled payment (optional)
        additional_metadata: Additional metadata to include (optional)
        
    Returns:
        dict: Checkout session data including URL
    """
    try:
        # Get or create Stripe customer
        customer_id = create_stripe_customer(order.user)
        
        # Create line items for the order
        line_items = [{
            'price_data': {
                'currency': order.currency.lower(),
                'product_data': {
                    'name': order.service.name if order.service else f"Order #{order.id}",
                    'description': order.service.description[:255] if order.service and order.service.description else None,
                },
                'unit_amount': format_amount_for_stripe(order.amount),
            },
            'quantity': 1,
        }]
        
        # Create metadata for the session
        metadata = create_payment_metadata(order, additional_metadata)
            
        # Set default URLs if not provided
        if not success_url:
            success_url = f"{settings.FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
        if not cancel_url:
            cancel_url = f"{settings.FRONTEND_URL}/checkout/cancel?session_id={{CHECKOUT_SESSION_ID}}"
            
        # Create the checkout session
        session = StripeClient.create_checkout_session(
            line_items=line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_id=customer_id,
            metadata=metadata,
            mode='payment'
        )
        
        # Update the order with the checkout session ID
        current_metadata = order.metadata or {}
        current_metadata.update({
            'checkout_session_id': session['id'],
            'stripe_payment_status': 'checkout_created'
        })
        order.metadata = current_metadata
        order.updated_at = timezone.now()
        order.save()
        
        return {
            'id': session['id'],
            'url': session['url']
        }
        
    except Exception as e:
        logger.exception(f"Error creating checkout session for order {order.id}: {str(e)}")
        raise

def create_payment_for_service(user, service, amount, payment_type='intent', service_data=None, scheduling_data=None, success_url=None, cancel_url=None):
    """
    Unified method to create a payment for a service.
    
    This method handles the entire flow:
    1. Create an Order record
    2. Create either a Payment Intent or Checkout Session
    
    Args:
        user: User model instance
        service: Service model instance
        amount: Amount to charge
        payment_type: 'intent' for Payment Intent, 'checkout' for Checkout Session
        service_data: Additional service data (optional)
        scheduling_data: Scheduling information (optional)
        success_url: URL to redirect after successful payment (optional, for checkout)
        cancel_url: URL to redirect after cancelled payment (optional, for checkout)
        
    Returns:
        dict: Payment data including client_secret or checkout URL
    """
    try:
        # Step 1: Create an Order
        order = create_order_for_booking_data(user, service, amount, service_data, scheduling_data)
        
        # Step 2: Create Payment Intent or Checkout Session
        if payment_type == 'intent':
            return create_payment_intent_for_order(order)
        elif payment_type == 'checkout':
            return create_checkout_session_for_order(order, success_url, cancel_url)
        else:
            raise ValueError(f"Invalid payment_type: {payment_type}")
            
    except Exception as e:
        logger.exception(f"Error creating payment for service {service.id}: {str(e)}")
        raise

def create_payment_for_credits(user, amount, credit_amount=None, payment_type='intent', success_url=None, cancel_url=None):
    """
    Unified method to create a payment for credit purchase.
    
    This method handles the entire flow:
    1. Create an Order record for credit purchase
    2. Create either a Payment Intent or Checkout Session
    
    Args:
        user: User model instance
        amount: Amount to charge
        credit_amount: Amount of credits to purchase (optional, defaults to amount)
        payment_type: 'intent' for Payment Intent, 'checkout' for Checkout Session
        success_url: URL to redirect after successful payment (optional, for checkout)
        cancel_url: URL to redirect after cancelled payment (optional, for checkout)
        
    Returns:
        dict: Payment data including client_secret or checkout URL
    """
    try:
        # Step 1: Create an Order for credit purchase
        order = create_order_for_credit_purchase(user, amount, credit_amount)
        
        # Step 2: Create Payment Intent or Checkout Session
        if payment_type == 'intent':
            return create_payment_intent_for_order(order)
        elif payment_type == 'checkout':
            return create_checkout_session_for_order(order, success_url, cancel_url)
        else:
            raise ValueError(f"Invalid payment_type: {payment_type}")
            
    except Exception as e:
        logger.exception(f"Error creating payment for credit purchase: {str(e)}")
        raise
