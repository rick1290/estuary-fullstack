import stripe
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class StripeClient:
    """
    Client for interacting with the Stripe API.
    
    This client handles payment intents, customers, and other Stripe
    services needed for the checkout process.
    
    This is designed to work with the existing payments system in the app.
    """
    
    @classmethod
    def get_api_key(cls):
        """
        Get the Stripe API key from settings.
        
        Returns:
            str: The API key
            
        Raises:
            ValueError: If the API key is not configured
        """
        api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
        if not api_key:
            logger.error("Stripe API key not found in settings")
            raise ValueError("Stripe API key not found in settings")
        return api_key
    
    @classmethod
    def initialize(cls):
        """Initialize the Stripe client with the API key."""
        stripe.api_key = cls.get_api_key()
        
    @classmethod
    def create_customer(cls, user, metadata=None):
        """
        Create a Stripe customer for a user.
        
        Args:
            user: User model instance
            metadata (dict, optional): Additional metadata for the customer
            
        Returns:
            dict: Stripe customer object
        """
        cls.initialize()
        
        try:
            customer_data = {
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip(),
            }
            
            if metadata:
                customer_data['metadata'] = metadata
                
            customer = stripe.Customer.create(**customer_data)
            
            return customer
            
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating Stripe customer: {str(e)}")
            raise
    
    @classmethod
    def create_payment_intent(cls, amount, currency='usd', customer_id=None, metadata=None, payment_method_types=None):
        """
        Create a payment intent for a purchase.
        
        Args:
            amount (int): Amount in cents
            currency (str): Currency code (default: usd)
            customer_id (str, optional): Stripe customer ID
            metadata (dict, optional): Additional metadata for the payment intent
            payment_method_types (list, optional): List of payment method types
            
        Returns:
            dict: Stripe payment intent object
        """
        cls.initialize()
        
        try:
            intent_data = {
                'amount': amount,
                'currency': currency,
            }
            
            if customer_id:
                intent_data['customer'] = customer_id
                
            if metadata:
                intent_data['metadata'] = metadata
                
            if payment_method_types:
                intent_data['payment_method_types'] = payment_method_types
            
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            return payment_intent
            
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating payment intent: {str(e)}")
            raise
    
    @classmethod
    def create_checkout_session(cls, line_items, success_url, cancel_url, customer_id=None, metadata=None, mode='payment'):
        """
        Create a Stripe Checkout Session.
        
        Args:
            line_items (list): List of items to purchase
            success_url (str): URL to redirect after successful payment
            cancel_url (str): URL to redirect after cancelled payment
            customer_id (str, optional): Stripe customer ID
            metadata (dict, optional): Additional metadata for the session
            mode (str): Checkout mode (payment, subscription, setup)
            
        Returns:
            dict: Stripe checkout session object
        """
        cls.initialize()
        
        try:
            session_data = {
                'line_items': line_items,
                'mode': mode,
                'success_url': success_url,
                'cancel_url': cancel_url,
            }
            
            if customer_id:
                session_data['customer'] = customer_id
                
            if metadata:
                session_data['metadata'] = metadata
            
            session = stripe.checkout.Session.create(**session_data)
            
            return session
            
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating checkout session: {str(e)}")
            raise
    
    @classmethod
    def retrieve_payment_intent(cls, payment_intent_id):
        """
        Retrieve a payment intent by ID.
        
        Args:
            payment_intent_id (str): Stripe payment intent ID
            
        Returns:
            dict: Stripe payment intent object
        """
        cls.initialize()
        
        try:
            return stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error retrieving payment intent: {str(e)}")
            raise
    
    @classmethod
    def construct_event(cls, payload, sig_header, webhook_secret):
        """
        Construct a Stripe event from webhook payload.
        
        Args:
            payload (str): Request body
            sig_header (str): Stripe signature header
            webhook_secret (str): Webhook signing secret
            
        Returns:
            Event: Stripe event object
        """
        cls.initialize()
        
        try:
            return stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            logger.exception(f"Error constructing webhook event: {str(e)}")
            raise
