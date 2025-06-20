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
            logger.warning("Stripe API key not found in settings - using placeholder")
            return "sk_test_placeholder_key"  # Return placeholder for development
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
    
    # Subscription methods
    @classmethod
    async def create_subscription(cls, customer_id, price_data=None, price_id=None, metadata=None):
        """
        Create a subscription for a customer.
        
        Args:
            customer_id (str): Stripe customer ID
            price_data (dict, optional): Price data for creating a new price
            price_id (str, optional): Existing price ID
            metadata (dict, optional): Additional metadata
            
        Returns:
            dict: Stripe subscription object
        """
        cls.initialize()
        
        try:
            subscription_data = {
                'customer': customer_id,
                'metadata': metadata or {}
            }
            
            if price_data:
                # Create subscription with inline price
                subscription_data['items'] = [{
                    'price_data': price_data
                }]
            elif price_id:
                # Use existing price
                subscription_data['items'] = [{
                    'price': price_id
                }]
            else:
                raise ValueError("Either price_data or price_id must be provided")
            
            return stripe.Subscription.create(**subscription_data)
            
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating subscription: {str(e)}")
            raise
    
    @classmethod
    async def update_subscription(cls, subscription_id, **kwargs):
        """Update a subscription"""
        cls.initialize()
        
        try:
            return stripe.Subscription.modify(subscription_id, **kwargs)
        except stripe.error.StripeError as e:
            logger.exception(f"Error updating subscription: {str(e)}")
            raise
    
    @classmethod
    async def cancel_subscription(cls, subscription_id, cancel_at_period_end=True):
        """Cancel a subscription"""
        cls.initialize()
        
        try:
            if cancel_at_period_end:
                return stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                return stripe.Subscription.delete(subscription_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error canceling subscription: {str(e)}")
            raise
    
    @classmethod
    def attach_payment_method(cls, payment_method_id, customer_id):
        """Attach a payment method to a customer"""
        cls.initialize()
        
        try:
            return stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
        except stripe.error.StripeError as e:
            logger.exception(f"Error attaching payment method: {str(e)}")
            raise
    
    @classmethod
    async def update_customer(cls, customer_id, **kwargs):
        """Update a customer"""
        cls.initialize()
        
        try:
            return stripe.Customer.modify(customer_id, **kwargs)
        except stripe.error.StripeError as e:
            logger.exception(f"Error updating customer: {str(e)}")
            raise
    
    @classmethod
    async def create_price(cls, unit_amount, currency='usd', recurring=None, product_data=None):
        """Create a price"""
        cls.initialize()
        
        try:
            price_data = {
                'unit_amount': unit_amount,
                'currency': currency,
            }
            
            if recurring:
                price_data['recurring'] = recurring
                
            if product_data:
                price_data['product_data'] = product_data
            
            return stripe.Price.create(**price_data)
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating price: {str(e)}")
            raise
    
    @classmethod
    async def list_invoices(cls, customer, limit=10, starting_after=None):
        """List invoices for a customer"""
        cls.initialize()
        
        try:
            params = {
                'customer': customer,
                'limit': limit
            }
            if starting_after:
                params['starting_after'] = starting_after
                
            return stripe.Invoice.list(**params)
        except stripe.error.StripeError as e:
            logger.exception(f"Error listing invoices: {str(e)}")
            raise
    
    @classmethod
    async def retrieve_customer(cls, customer_id):
        """Retrieve a customer"""
        cls.initialize()
        
        try:
            return stripe.Customer.retrieve(customer_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error retrieving customer: {str(e)}")
            raise
    
    @classmethod
    async def list_payment_methods(cls, customer, type='card'):
        """List payment methods for a customer"""
        cls.initialize()
        
        try:
            return stripe.PaymentMethod.list(
                customer=customer,
                type=type
            )
        except stripe.error.StripeError as e:
            logger.exception(f"Error listing payment methods: {str(e)}")
            raise
    
    @classmethod
    def retrieve_payment_method(cls, payment_method_id):
        """Retrieve a payment method"""
        cls.initialize()
        
        try:
            return stripe.PaymentMethod.retrieve(payment_method_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error retrieving payment method: {str(e)}")
            raise
    
    @classmethod
    def detach_payment_method(cls, payment_method_id):
        """Detach a payment method"""
        cls.initialize()
        
        try:
            return stripe.PaymentMethod.detach(payment_method_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error detaching payment method: {str(e)}")
            raise
    
    @classmethod
    async def retrieve_account(cls, account_id):
        """Retrieve a Stripe Connect account"""
        cls.initialize()
        
        try:
            return stripe.Account.retrieve(account_id)
        except stripe.error.StripeError as e:
            logger.exception(f"Error retrieving account: {str(e)}")
            raise
    
    @classmethod
    async def create_account(cls, type='express', email=None, metadata=None):
        """Create a Stripe Connect account"""
        cls.initialize()
        
        try:
            account_data = {'type': type}
            if email:
                account_data['email'] = email
            if metadata:
                account_data['metadata'] = metadata
            
            return stripe.Account.create(**account_data)
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating account: {str(e)}")
            raise
    
    @classmethod
    async def create_account_link(cls, account, refresh_url, return_url, type='account_onboarding'):
        """Create a Stripe Connect account link"""
        cls.initialize()
        
        try:
            return stripe.AccountLink.create(
                account=account,
                refresh_url=refresh_url,
                return_url=return_url,
                type=type
            )
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating account link: {str(e)}")
            raise
    
    @classmethod
    async def create_refund(cls, payment_intent, amount=None, reason=None):
        """Create a refund"""
        cls.initialize()
        
        try:
            refund_data = {'payment_intent': payment_intent}
            if amount:
                refund_data['amount'] = amount
            if reason:
                refund_data['reason'] = reason
            
            return stripe.Refund.create(**refund_data)
        except stripe.error.StripeError as e:
            logger.exception(f"Error creating refund: {str(e)}")
            raise


# Create a singleton instance
stripe_client = StripeClient()
