"""
Views for payments app
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from decimal import Decimal
import stripe
import logging
from drf_spectacular.utils import extend_schema, extend_schema_view

from payments.models import (
    Order, UserCreditTransaction, UserCreditBalance, PaymentMethod,
    EarningsTransaction, PractitionerEarnings, PractitionerPayout,
    SubscriptionTier, PractitionerSubscription
)
from users.models import User
from practitioners.models import Practitioner
from services.models import ServiceType
from bookings.models import Booking
from integrations.stripe.client import StripeClient

from .serializers import (
    # Payment Methods
    PaymentMethodSerializer, PaymentMethodCreateSerializer,
    # Orders
    OrderSerializer, CheckoutSessionSerializer,
    # Credits
    UserCreditTransactionSerializer, UserCreditBalanceSerializer,
    CreditPurchaseSerializer, CreditTransferSerializer,
    # Earnings
    EarningsTransactionSerializer, PractitionerEarningsSerializer,
    PractitionerPayoutSerializer, PayoutRequestSerializer,
    # Subscriptions
    SubscriptionTierSerializer, PractitionerSubscriptionSerializer,
    SubscriptionCreateSerializer,
    # Others
    CommissionRateSerializer, CommissionCalculationSerializer,
    RefundSerializer, WebhookEventSerializer
)
from .permissions import (
    IsOwnerOrReadOnly, IsPractitionerOwner, IsStaffOrReadOnly
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    list=extend_schema(tags=['Payments']),
    create=extend_schema(tags=['Payments']),
    retrieve=extend_schema(tags=['Payments']),
    update=extend_schema(tags=['Payments']),
    partial_update=extend_schema(tags=['Payments']),
    destroy=extend_schema(tags=['Payments']),
    set_default=extend_schema(tags=['Payments'])
)
class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payment methods
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter payment methods by current user"""
        return PaymentMethod.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-is_default', '-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentMethodCreateSerializer
        return PaymentMethodSerializer
    
    def perform_destroy(self, instance):
        """Soft delete and detach from Stripe"""
        stripe_client = StripeClient()
        try:
            stripe_client.detach_payment_method(instance.stripe_payment_method_id)
        except Exception as e:
            logger.error(f"Failed to detach payment method from Stripe: {e}")
        
        instance.is_active = False
        instance.save()
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set payment method as default"""
        payment_method = self.get_object()
        
        with transaction.atomic():
            # Unset other defaults
            PaymentMethod.objects.filter(
                user=request.user,
                is_default=True
            ).exclude(id=payment_method.id).update(is_default=False)
            
            payment_method.is_default = True
            payment_method.save()
        
        serializer = self.get_serializer(payment_method)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=['Payments']),
    retrieve=extend_schema(tags=['Payments']),
    transactions=extend_schema(tags=['Payments']),
    balance=extend_schema(tags=['Payments'])
)
class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing payment transactions (orders)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'order_type', 'payment_method']
    ordering_fields = ['created_at', 'total_amount_cents']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter orders based on user role"""
        user = self.request.user
        queryset = Order.objects.all()
        
        if user.is_staff:
            # Staff can see all orders
            pass
        elif hasattr(user, 'practitioner_profile'):
            # Practitioners can see orders related to them
            queryset = queryset.filter(practitioner=user.practitioner_profile)
        else:
            # Regular users see only their orders
            queryset = queryset.filter(user=user)
        
        # Date filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.select_related('user', 'service', 'practitioner')


@extend_schema_view(
    create_session=extend_schema(tags=['Payments'])
)
class CheckoutViewSet(viewsets.GenericViewSet):
    """
    ViewSet for creating Stripe checkout sessions
    """
    serializer_class = CheckoutSessionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_session(self, request):
        """Create a Stripe checkout session"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        stripe_client = StripeClient()
        user = request.user
        data = serializer.validated_data
        
        # Prepare line items based on order type
        line_items = []
        metadata = {
            'user_id': str(user.id),
            'order_type': data['order_type']
        }
        
        if data['order_type'] == 'direct':
            service = get_object_or_404(Service, id=data['service_id'])
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': service.name,
                        'description': service.description[:500] if service.description else None,
                    },
                    'unit_amount': int(service.price * 100),
                },
                'quantity': 1,
            })
            metadata['service_id'] = str(service.id)
            
        elif data['order_type'] == 'credit':
            amount = data['credit_amount']
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Account Credits',
                        'description': f'Purchase ${amount} in account credits',
                    },
                    'unit_amount': int(amount * 100),
                },
                'quantity': 1,
            })
            metadata['credit_amount'] = str(amount)
            
        elif data['order_type'] == 'subscription':
            tier = get_object_or_404(SubscriptionTier, id=data['subscription_tier_id'])
            price_id = tier.stripe_annual_price_id if data.get('is_annual') else tier.stripe_monthly_price_id
            
            if not price_id:
                return Response(
                    {'error': 'Subscription tier not properly configured'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # For subscriptions, we use the existing price ID
            line_items.append({
                'price': price_id,
                'quantity': 1,
            })
            metadata['subscription_tier_id'] = str(tier.id)
            metadata['is_annual'] = str(data.get('is_annual', False))
        
        # Ensure user has a Stripe customer
        if not hasattr(user, 'payment_profile') or not user.payment_profile.stripe_customer_id:
            from users.models import UserPaymentProfile
            profile, created = UserPaymentProfile.objects.get_or_create(user=user)
            if not profile.stripe_customer_id:
                customer = stripe_client.customers.create(
                    email=user.email,
                    name=user.get_full_name()
                )
                profile.stripe_customer_id = customer.id
                profile.save()
        
        # Create checkout session
        session_params = {
            'payment_method_types': ['card'],
            'line_items': line_items,
            'mode': 'subscription' if data['order_type'] == 'subscription' else 'payment',
            'success_url': data['success_url'],
            'cancel_url': data['cancel_url'],
            'customer': user.payment_profile.stripe_customer_id,
            'metadata': metadata,
        }
        
        # Add subscription data if applicable
        if data['order_type'] == 'subscription':
            session_params['subscription_data'] = {
                'metadata': metadata
            }
        
        session = stripe_client.checkout.sessions.create(**session_params)
        
        return Response({
            'session_id': session.id,
            'url': session.url
        })


@extend_schema_view(
    balance=extend_schema(tags=['Payments']),
    transactions=extend_schema(tags=['Payments']),
    purchase=extend_schema(tags=['Payments']),
    transfer=extend_schema(tags=['Payments'])
)
class CreditViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing credits
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Get current credit balance"""
        balance, created = UserCreditBalance.objects.get_or_create(user=request.user)
        serializer = UserCreditBalanceSerializer(balance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """List credit transactions"""
        transactions = UserCreditTransaction.objects.filter(
            user=request.user
        ).order_by('-created_at')
        
        # Date filtering
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        transaction_type = request.query_params.get('type')
        
        if date_from:
            transactions = transactions.filter(created_at__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__lte=date_to)
        if transaction_type:
            transactions = transactions.filter(transaction_type=transaction_type)
        
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = UserCreditTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UserCreditTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def purchase(self, request):
        """Purchase credits"""
        serializer = CreditPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amount = serializer.validated_data['amount']
        stripe_client = StripeClient()
        
        # Create payment intent
        intent = stripe_client.payment_intents.create(
            amount=int(amount * 100),
            currency='usd',
            payment_method=serializer.validated_data.get('payment_method_id'),
            customer=request.user.payment_profile.stripe_customer_id,
            metadata={
                'user_id': str(request.user.id),
                'type': 'credit_purchase',
                'amount': str(amount)
            },
            confirm=True if serializer.validated_data.get('payment_method_id') else False
        )
        
        return Response({
            'payment_intent_id': intent.id,
            'client_secret': intent.client_secret,
            'status': intent.status
        })
    
    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """Transfer credits to another user"""
        serializer = CreditTransferSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        recipient = User.objects.get(email=serializer.validated_data['recipient_email'])
        amount = serializer.validated_data['amount']
        description = serializer.validated_data.get('description', '')
        
        with transaction.atomic():
            # Debit sender
            UserCreditTransaction.objects.create(
                user=request.user,
                amount_cents=-int(amount * 100),
                transaction_type='transfer',
                description=f"Transfer to {recipient.get_full_name() or recipient.email}. {description}".strip(),
                metadata={
                    'recipient_user_id': str(recipient.id),
                    'recipient_email': recipient.email
                }
            )
            
            # Credit recipient
            UserCreditTransaction.objects.create(
                user=recipient,
                amount_cents=int(amount * 100),
                transaction_type='transfer',
                description=f"Transfer from {request.user.get_full_name() or request.user.email}. {description}".strip(),
                metadata={
                    'sender_user_id': str(request.user.id),
                    'sender_email': request.user.email
                }
            )
        
        return Response({
            'message': f'Successfully transferred ${amount} to {recipient.email}'
        })


@extend_schema_view(
    list=extend_schema(tags=['Payments']),
    create=extend_schema(tags=['Payments']),
    retrieve=extend_schema(tags=['Payments']),
    update=extend_schema(tags=['Payments']),
    partial_update=extend_schema(tags=['Payments']),
    destroy=extend_schema(tags=['Payments']),
    summary=extend_schema(tags=['Payments']),
    process=extend_schema(tags=['Payments']),
    mark_failed=extend_schema(tags=['Payments'])
)
class PayoutViewSet(viewsets.ModelViewSet):
    """
    ViewSet for practitioner payouts
    """
    serializer_class = PractitionerPayoutSerializer
    permission_classes = [IsAuthenticated, IsPractitionerOwner]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    ordering_fields = ['created_at', 'credits_payout_cents']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter payouts based on user role"""
        user = self.request.user
        
        if user.is_staff:
            return PractitionerPayout.objects.all()
        elif hasattr(user, 'practitioner_profile'):
            return PractitionerPayout.objects.filter(
                practitioner=user.practitioner_profile
            )
        return PractitionerPayout.objects.none()
    
    @action(detail=False, methods=['get'])
    def earnings_balance(self, request):
        """Get practitioner's earnings balance"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        balance, created = PractitionerEarnings.objects.get_or_create(
            practitioner=request.user.practitioner_profile
        )
        serializer = PractitionerEarningsSerializer(balance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def earnings_transactions(self, request):
        """List earnings transactions"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        transactions = EarningsTransaction.objects.filter(
            practitioner=request.user.practitioner_profile
        ).order_by('-created_at')
        
        # Filtering
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if status_filter:
            transactions = transactions.filter(status=status_filter)
        if date_from:
            transactions = transactions.filter(created_at__gte=date_from)
        if date_to:
            transactions = transactions.filter(created_at__lte=date_to)
        
        page = self.paginate_queryset(transactions)
        if page is not None:
            serializer = EarningsTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = EarningsTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def request_payout(self, request):
        """Request a payout"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = PayoutRequestSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        practitioner = request.user.practitioner_profile
        earnings = PractitionerEarnings.objects.filter(practitioner=practitioner).first()
        
        if not earnings or earnings.available_balance <= 0:
            return Response(
                {'error': 'No funds available for payout'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine payout amount
        amount = serializer.validated_data.get('amount') or earnings.available_balance
        
        # Get available transactions
        available_transactions = EarningsTransaction.objects.filter(
            practitioner=practitioner,
            status='available'
        ).order_by('created_at')
        
        # Create payout
        payout = PractitionerPayout.create_batch_payout(
            practitioner=practitioner,
            transactions=available_transactions,
            processed_by=request.user if request.user.is_staff else None,
            notes=serializer.validated_data.get('notes')
        )
        
        serializer = PractitionerPayoutSerializer(payout)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    list=extend_schema(tags=['Subscriptions']),
    create=extend_schema(tags=['Subscriptions']),
    retrieve=extend_schema(tags=['Subscriptions']),
    update=extend_schema(tags=['Subscriptions']),
    partial_update=extend_schema(tags=['Subscriptions']),
    destroy=extend_schema(tags=['Subscriptions']),
    current=extend_schema(tags=['Subscriptions']),
    tiers=extend_schema(tags=['Subscriptions']),
    upgrade=extend_schema(tags=['Subscriptions']),
    cancel=extend_schema(tags=['Subscriptions']),
    reactivate=extend_schema(tags=['Subscriptions'])
)
class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for practitioner subscriptions
    """
    serializer_class = PractitionerSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter subscriptions based on user"""
        if self.request.user.is_staff:
            return PractitionerSubscription.objects.all()
        elif hasattr(self.request.user, 'practitioner_profile'):
            return PractitionerSubscription.objects.filter(
                practitioner=self.request.user.practitioner_profile
            )
        return PractitionerSubscription.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SubscriptionCreateSerializer
        return PractitionerSubscriptionSerializer
    
    @action(detail=False, methods=['get'])
    def tiers(self, request):
        """List available subscription tiers"""
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('order')
        serializer = SubscriptionTierSerializer(tiers, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new subscription"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        tier = get_object_or_404(
            SubscriptionTier,
            id=serializer.validated_data['tier_id']
        )
        
        # Cancel existing active subscription if any
        existing = PractitionerSubscription.objects.filter(
            practitioner=request.user.practitioner_profile,
            status='active'
        ).first()
        
        if existing:
            # Cancel in Stripe
            if existing.stripe_subscription_id:
                stripe_client = StripeClient()
                try:
                    stripe_client.subscriptions.delete(existing.stripe_subscription_id)
                except Exception as e:
                    logger.error(f"Failed to cancel Stripe subscription: {e}")
            
            existing.status = 'canceled'
            existing.end_date = timezone.now()
            existing.save()
        
        # Create Stripe subscription
        stripe_client = StripeClient()
        price_id = (
            tier.stripe_annual_price_id 
            if serializer.validated_data.get('is_annual') 
            else tier.stripe_monthly_price_id
        )
        
        stripe_subscription = stripe_client.subscriptions.create(
            customer=request.user.payment_profile.stripe_customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            expand=['latest_invoice.payment_intent'],
            metadata={
                'practitioner_id': str(request.user.practitioner_profile.id),
                'tier_id': str(tier.id)
            }
        )
        
        # Create subscription record
        subscription = PractitionerSubscription.objects.create(
            practitioner=request.user.practitioner_profile,
            tier=tier,
            status='active',
            is_annual=serializer.validated_data.get('is_annual', False),
            stripe_subscription_id=stripe_subscription.id
        )
        
        response_serializer = PractitionerSubscriptionSerializer(subscription)
        return Response(
            {
                'subscription': response_serializer.data,
                'client_secret': stripe_subscription.latest_invoice.payment_intent.client_secret
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()
        
        if subscription.status != 'active':
            return Response(
                {'error': 'Subscription is not active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel in Stripe
        if subscription.stripe_subscription_id:
            stripe_client = StripeClient()
            try:
                stripe_client.subscriptions.update(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
            except Exception as e:
                logger.error(f"Failed to cancel Stripe subscription: {e}")
                return Response(
                    {'error': 'Failed to cancel subscription'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        subscription.status = 'canceled'
        subscription.auto_renew = False
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)


class WebhookView(APIView):
    """
    Handle Stripe webhooks
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Process webhook events"""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        if not sig_header:
            return Response(
                {'error': 'Missing signature'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify webhook signature
            stripe.api_key = settings.STRIPE_SECRET_KEY
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response(
                {'error': 'Invalid payload'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except stripe.error.SignatureVerificationError:
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the event
        serializer = WebhookEventSerializer(data={
            'type': event['type'],
            'data': event['data']
        })
        
        if not serializer.is_valid():
            logger.warning(f"Unsupported webhook event: {event['type']}")
            return Response({'received': True})
        
        # Handle specific event types
        event_type = event['type']
        event_data = event['data']['object']
        
        try:
            if event_type == 'payment_intent.succeeded':
                self._handle_payment_success(event_data)
            elif event_type == 'payment_intent.payment_failed':
                self._handle_payment_failure(event_data)
            elif event_type == 'customer.subscription.created':
                self._handle_subscription_created(event_data)
            elif event_type == 'customer.subscription.deleted':
                self._handle_subscription_deleted(event_data)
            elif event_type == 'charge.refunded':
                self._handle_refund(event_data)
            elif event_type == 'account.updated':
                self._handle_connect_account_update(event_data)
            elif event_type == 'payout.paid':
                self._handle_payout_paid(event_data)
            elif event_type == 'payout.failed':
                self._handle_payout_failed(event_data)
        except Exception as e:
            logger.error(f"Error processing webhook {event_type}: {e}")
            return Response(
                {'error': 'Processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({'received': True})
    
    def _handle_payment_success(self, payment_intent):
        """Handle successful payment"""
        metadata = payment_intent.get('metadata', {})
        
        if metadata.get('type') == 'credit_purchase':
            # Create credit transaction
            user_id = metadata.get('user_id')
            amount = Decimal(metadata.get('amount', '0'))
            
            if user_id and amount > 0:
                user = User.objects.filter(id=user_id).first()
                if user:
                    UserCreditTransaction.objects.create(
                        user=user,
                        amount_cents=int(amount * 100),
                        transaction_type='purchase',
                        description=f"Credit purchase via Stripe",
                        metadata={
                            'stripe_payment_intent_id': payment_intent['id']
                        }
                    )
        
        elif metadata.get('order_id'):
            # Update order status
            order = Order.objects.filter(id=metadata['order_id']).first()
            if order:
                order.status = 'completed'
                order.stripe_payment_intent_id = payment_intent['id']
                order.save()
    
    def _handle_payment_failure(self, payment_intent):
        """Handle failed payment"""
        metadata = payment_intent.get('metadata', {})
        
        if metadata.get('order_id'):
            order = Order.objects.filter(id=metadata['order_id']).first()
            if order:
                order.status = 'failed'
                order.save()
    
    def _handle_subscription_created(self, subscription):
        """Handle subscription creation"""
        metadata = subscription.get('metadata', {})
        practitioner_id = metadata.get('practitioner_id')
        
        if practitioner_id:
            # Update subscription record
            sub = PractitionerSubscription.objects.filter(
                practitioner_id=practitioner_id,
                stripe_subscription_id=subscription['id']
            ).first()
            
            if sub:
                sub.status = 'active'
                sub.save()
    
    def _handle_subscription_deleted(self, subscription):
        """Handle subscription cancellation"""
        sub = PractitionerSubscription.objects.filter(
            stripe_subscription_id=subscription['id']
        ).first()
        
        if sub:
            sub.status = 'canceled'
            sub.end_date = timezone.now()
            sub.save()
    
    def _handle_refund(self, charge):
        """Handle refund"""
        # Find related order
        payment_intent_id = charge.get('payment_intent')
        if payment_intent_id:
            order = Order.objects.filter(
                stripe_payment_intent_id=payment_intent_id
            ).first()
            
            if order:
                refund_amount = Decimal(charge['amount_refunded']) / 100
                if refund_amount >= order.total_amount:
                    order.status = 'refunded'
                else:
                    order.status = 'partially_refunded'
                order.save()
    
    def _handle_connect_account_update(self, account):
        """Handle Stripe Connect account updates"""
        practitioner = Practitioner.objects.filter(
            stripe_account_id=account['id']
        ).first()
        
        if practitioner:
            # Update verification status
            practitioner.stripe_verified = (
                account.get('charges_enabled', False) and
                account.get('payouts_enabled', False)
            )
            practitioner.save()
    
    def _handle_payout_paid(self, payout):
        """Handle successful payout"""
        # Find related payout record
        payout_record = PractitionerPayout.objects.filter(
            stripe_transfer_id=payout['id']
        ).first()
        
        if payout_record:
            payout_record.status = 'completed'
            payout_record.payout_date = timezone.now()
            payout_record.save()
    
    def _handle_payout_failed(self, payout):
        """Handle failed payout"""
        payout_record = PractitionerPayout.objects.filter(
            stripe_transfer_id=payout['id']
        ).first()
        
        if payout_record:
            payout_record.status = 'failed'
            payout_record.error_message = payout.get('failure_message', 'Unknown error')
            payout_record.save()


@extend_schema_view(
    rates=extend_schema(tags=['Payments']),
    calculate=extend_schema(tags=['Payments'])
)
class CommissionViewSet(viewsets.GenericViewSet):
    """
    ViewSet for commission information
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def rates(self, request):
        """Get commission rates for current practitioner"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        practitioner = request.user.practitioner_profile
        
        # Get active subscription
        subscription = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status='active'
        ).first()
        
        tier = subscription.tier if subscription else None
        
        # Get commission rates for all service types
        from payments.services import CommissionCalculator
        calculator = CommissionCalculator()
        
        rates = []
        for service_type in ServiceType.objects.all():
            rate = calculator.get_commission_rate(practitioner, service_type)
            rates.append({
                'service_type': service_type.name,
                'base_rate': calculator.get_base_rate(service_type),
                'tier_adjustment': calculator.get_tier_adjustment(tier, service_type) if tier else 0,
                'effective_rate': rate
            })
        
        return Response(rates)
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate commission for a hypothetical transaction"""
        serializer = CommissionCalculationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        gross_amount = serializer.validated_data['gross_amount']
        service_type = get_object_or_404(
            ServiceType,
            id=serializer.validated_data['service_type_id']
        )
        
        from payments.services import CommissionCalculator
        calculator = CommissionCalculator()
        
        result = calculator.calculate_commission(
            practitioner=request.user.practitioner_profile,
            service_type=service_type,
            gross_amount=gross_amount
        )
        
        return Response(result)