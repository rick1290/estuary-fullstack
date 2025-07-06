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
from payments.constants import SubscriptionTierCode
from users.models import User
from practitioners.models import Practitioner
from services.models import Service, ServiceType
from bookings.models import Booking
from integrations.stripe.client import StripeClient

from .serializers import (
    # Payment Methods
    PaymentMethodSerializer, PaymentMethodCreateSerializer,
    # Orders
    OrderSerializer, CheckoutSessionSerializer, DirectPaymentSerializer,
    # Credits
    UserCreditTransactionSerializer, UserCreditBalanceSerializer,
    CreditPurchaseSerializer, CreditTransferSerializer,
    # Earnings
    EarningsTransactionSerializer, PractitionerEarningsSerializer,
    PractitionerPayoutSerializer, PayoutRequestSerializer,
    # Subscriptions
    SubscriptionTierSerializer, PractitionerSubscriptionSerializer,
    SubscriptionCreateSerializer, SubscriptionTiersResponseSerializer,
    # Others
    CommissionRateSerializer, CommissionCalculationSerializer,
    RefundSerializer, WebhookEventSerializer
)
from .permissions import (
    IsOwnerOrReadOnly, IsPractitionerOwner, IsStaffOrReadOnly
)
from payments.services.checkout_orchestrator import CheckoutOrchestrator

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
    create_session=extend_schema(tags=['Payments']),
    direct_payment=extend_schema(tags=['Payments'])
)
class CheckoutViewSet(viewsets.GenericViewSet):
    """
    ViewSet for creating Stripe checkout sessions
    """
    serializer_class = CheckoutSessionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_session(self, request):
        """Create a Stripe checkout session using CheckoutService"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        data = serializer.validated_data
        
        # Use CheckoutService
        from payments.services import CheckoutService
        checkout_service = CheckoutService()
        
        try:
            if data['order_type'] == 'direct':
                # Service booking
                service = get_object_or_404(Service, id=data['service_id'])
                result = checkout_service.create_service_checkout_session(
                    service=service,
                    user=user,
                    success_url=data['success_url'],
                    cancel_url=data['cancel_url'],
                    booking_data=data.get('booking_data', {})
                )
                
            elif data['order_type'] == 'credit':
                # Credit purchase
                result = checkout_service.create_credit_checkout_session(
                    amount=data['credit_amount'],
                    user=user,
                    success_url=data['success_url'],
                    cancel_url=data['cancel_url']
                )
                
            elif data['order_type'] == 'subscription':
                # Subscription
                tier = get_object_or_404(SubscriptionTier, id=data['subscription_tier_id'])
                practitioner_id = None
                if hasattr(user, 'practitioner_profile'):
                    practitioner_id = str(user.practitioner_profile.id)
                    
                result = checkout_service.create_subscription_checkout_session(
                    tier=tier,
                    user=user,
                    is_annual=data.get('is_annual', False),
                    success_url=data['success_url'],
                    cancel_url=data['cancel_url'],
                    practitioner_id=practitioner_id
                )
            else:
                return Response({
                    'error': f'Invalid order type: {data["order_type"]}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(result)
            
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to create checkout session: {e}")
            return Response({
                'error': 'Failed to create checkout session'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def direct_payment(self, request):
        """Process direct payment with saved payment method using orchestrator"""
        serializer = DirectPaymentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        orchestrator = CheckoutOrchestrator()
        
        try:
            result = orchestrator.process_booking_payment(
                user=request.user,
                service_id=serializer.validated_data['service_id'],
                payment_method_id=serializer.validated_data['payment_method_id'],
                booking_data=serializer.validated_data
            )
            
            if result.requires_action:
                return Response({
                    'status': 'requires_action',
                    'order_id': str(result.order.id),
                    'payment_intent_id': result.payment_intent.id,
                    'client_secret': result.client_secret
                })
            elif result.success:
                return Response({
                    'status': 'success',
                    'order_id': str(result.order.id),
                    'booking_id': str(result.booking.id) if result.booking else None,
                    'payment_intent_id': result.payment_intent.id if result.payment_intent else None,
                    'amount_charged': result.order.total_amount_cents / 100,
                    'credits_applied': result.order.credits_applied_cents / 100
                })
            else:
                return Response({
                    'status': 'error',
                    'message': result.error or 'Payment processing failed'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except stripe.error.CardError as e:
            return Response({
                'status': 'error',
                'message': str(e.user_message)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Payment processing error: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Payment processing failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        """Purchase credits using orchestrator"""
        serializer = CreditPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        orchestrator = CheckoutOrchestrator()
        
        try:
            result = orchestrator.process_credit_purchase(
                user=request.user,
                amount=serializer.validated_data['amount'],
                payment_method_id=serializer.validated_data['payment_method_id']
            )
            
            if result.requires_action:
                return Response({
                    'payment_intent_id': result.payment_intent.id,
                    'client_secret': result.client_secret,
                    'status': 'requires_action',
                    'order_id': str(result.order.id)
                })
            elif result.success:
                return Response({
                    'payment_intent_id': result.payment_intent.id if result.payment_intent else None,
                    'status': 'success',
                    'order_id': str(result.order.id),
                    'credits_added': serializer.validated_data['amount']
                })
            else:
                return Response({
                    'status': 'error',
                    'message': result.error or 'Credit purchase failed'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Credit purchase error: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Credit purchase failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """Transfer credits to another user using CreditService"""
        serializer = CreditTransferSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        recipient = User.objects.get(email=serializer.validated_data['recipient_email'])
        amount = serializer.validated_data['amount']
        description = serializer.validated_data.get('description', '')
        
        # Use CreditService for transfer
        from payments.services import CreditService
        credit_service = CreditService()
        
        try:
            debit_tx, credit_tx = credit_service.transfer_credits(
                from_user=request.user,
                to_user=recipient,
                amount_cents=int(amount * 100),
                reason=description or "Credit transfer"
            )
            
            return Response({
                'message': f'Successfully transferred ${amount} to {recipient.email}',
                'transaction_id': str(credit_tx.id)
            })
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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
        """Request a payout using PayoutService"""
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
        
        # Use PayoutService
        from payments.services import PayoutService
        payout_service = PayoutService()
        
        # Check eligibility first
        eligibility = payout_service.check_payout_eligibility(practitioner)
        if not eligibility['is_eligible']:
            return Response({
                'error': eligibility['reason'],
                'available_balance': float(eligibility['available_balance']),
                'minimum_payout': float(eligibility['minimum_payout'])
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create payout request
            payout = payout_service.create_payout_request(
                practitioner=practitioner,
                amount=serializer.validated_data.get('amount'),
                notes=serializer.validated_data.get('notes'),
                processed_by=request.user if request.user.is_staff else None
            )
            
            serializer = PractitionerPayoutSerializer(payout)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(tags=['Subscriptions']),
    create=extend_schema(tags=['Subscriptions']),
    retrieve=extend_schema(tags=['Subscriptions']),
    update=extend_schema(tags=['Subscriptions']),
    partial_update=extend_schema(tags=['Subscriptions']),
    destroy=extend_schema(tags=['Subscriptions']),
    current=extend_schema(tags=['Subscriptions']),
    tiers=extend_schema(
        tags=['Subscriptions'],
        responses={200: SubscriptionTiersResponseSerializer}
    ),
    confirm_payment=extend_schema(tags=['Subscriptions']),
    cancel=extend_schema(tags=['Subscriptions'])
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
    def current(self, request):
        """Get current subscription for the authenticated practitioner"""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        practitioner = request.user.practitioner_profile
        if practitioner.current_subscription and practitioner.current_subscription.is_active:
            serializer = PractitionerSubscriptionSerializer(practitioner.current_subscription)
            return Response(serializer.data)
        
        return Response(
            {'message': 'No active subscription'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['get'])
    def tiers(self, request):
        """List available subscription tiers with structured response"""
        from payments.constants import SubscriptionTierCode
        
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('order')
        serializer = SubscriptionTierSerializer(tiers, many=True)
        
        # Create a structured response with tier codes as keys
        tier_data = {}
        for tier in tiers:
            if hasattr(tier, 'code'):
                tier_data[tier.code] = SubscriptionTierSerializer(tier).data
        
        # Ensure all tier codes are present (even if not in DB)
        for code in SubscriptionTierCode.values:
            if code not in tier_data:
                tier_data[code] = None
        
        return Response({
            'tiers': serializer.data,  # Array format for compatibility
            'tiersByCode': tier_data,   # Object format for easy access
            'availableCodes': list(SubscriptionTierCode.values),
            'codeLabels': dict(SubscriptionTierCode.choices)
        })
    
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
                stripe_client.initialize()
                try:
                    import stripe
                    stripe.Subscription.delete(existing.stripe_subscription_id)
                except Exception as e:
                    logger.error(f"Failed to cancel Stripe subscription: {e}")
            
            existing.status = 'canceled'
            existing.end_date = timezone.now()
            existing.save()
        
        # Create Stripe subscription
        stripe_client = StripeClient()
        stripe_client.initialize()
        
        price_id = (
            tier.stripe_annual_price_id 
            if serializer.validated_data.get('is_annual') 
            else tier.stripe_monthly_price_id
        )
        
        if not price_id:
            return Response(
                {'error': 'Stripe pricing not configured for this tier. Please contact support.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure user has payment profile
        if not hasattr(request.user, 'payment_profile') or not request.user.payment_profile.stripe_customer_id:
            # Create Stripe customer if needed
            customer = stripe_client.create_customer(request.user)
            from users.models import UserPaymentProfile
            profile, created = UserPaymentProfile.objects.get_or_create(user=request.user)
            profile.stripe_customer_id = customer.id
            profile.save()
        
        import stripe
        
        # Set default payment method if provided
        payment_method_id = serializer.validated_data.get('payment_method_id')
        if payment_method_id:
            # Verify payment method belongs to user
            payment_method = PaymentMethod.objects.filter(
                user=request.user,
                stripe_payment_method_id=payment_method_id,
                is_active=True
            ).first()
            
            if payment_method:
                # Set as default payment method for the customer
                stripe.Customer.modify(
                    request.user.payment_profile.stripe_customer_id,
                    invoice_settings={
                        'default_payment_method': payment_method_id
                    }
                )
        
        # Check if this is a free tier (price is 0)
        is_free_tier = False
        if tier.monthly_price == 0 and tier.annual_price == 0:
            is_free_tier = True
        
        # Create subscription with different behavior for free vs paid
        if is_free_tier:
            # For free subscriptions, we don't need payment
            stripe_subscription = stripe.Subscription.create(
                customer=request.user.payment_profile.stripe_customer_id,
                items=[{'price': price_id}],
                expand=['latest_invoice.payment_intent'],
                metadata={
                    'practitioner_id': str(request.user.practitioner_profile.id),
                    'tier_id': str(tier.id)
                }
            )
        else:
            # For paid subscriptions, require payment
            stripe_subscription = stripe.Subscription.create(
                customer=request.user.payment_profile.stripe_customer_id,
                items=[{'price': price_id}],
                payment_behavior='default_incomplete',
                payment_settings={
                    'payment_method_types': ['card'],
                    'save_default_payment_method': 'on_subscription'
                },
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
            status='active' if is_free_tier else 'incomplete',
            is_annual=serializer.validated_data.get('is_annual', False),
            stripe_subscription_id=stripe_subscription.id
        )
        
        # Update practitioner's current subscription
        practitioner = request.user.practitioner_profile
        practitioner.current_subscription = subscription
        practitioner.save(update_fields=['current_subscription'])
        
        response_serializer = PractitionerSubscriptionSerializer(subscription)
        
        # Build response based on whether payment is needed
        response_data = {
            'subscription': response_serializer.data,
        }
        
        # Only include client_secret if there's a payment intent
        if (stripe_subscription.latest_invoice and 
            stripe_subscription.latest_invoice.payment_intent and
            stripe_subscription.latest_invoice.payment_intent.client_secret):
            response_data['client_secret'] = stripe_subscription.latest_invoice.payment_intent.client_secret
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        """Confirm payment for a subscription after frontend payment confirmation"""
        subscription = self.get_object()
        
        # Only confirm if subscription is incomplete
        if subscription.status != 'incomplete':
            return Response(
                {'message': 'Subscription is already active or does not need confirmation'},
                status=status.HTTP_200_OK
            )
        
        # Verify with Stripe that the subscription is actually paid
        stripe_client = StripeClient()
        stripe_client.initialize()
        
        try:
            import stripe
            stripe_subscription = stripe.Subscription.retrieve(
                subscription.stripe_subscription_id,
                expand=['latest_invoice.payment_intent']
            )
            
            # Check if the subscription is active in Stripe
            if stripe_subscription.status == 'active':
                # Update our subscription to active
                subscription.status = 'active'
                subscription.save()
                
                # Update practitioner's current subscription
                practitioner = subscription.practitioner
                practitioner.current_subscription = subscription
                practitioner.save(update_fields=['current_subscription'])
                
                serializer = self.get_serializer(subscription)
                return Response({
                    'subscription': serializer.data,
                    'message': 'Subscription activated successfully'
                })
            else:
                # Payment might still be processing
                return Response({
                    'subscription': self.get_serializer(subscription).data,
                    'message': f'Subscription is {stripe_subscription.status} in Stripe',
                    'stripe_status': stripe_subscription.status
                }, status=status.HTTP_202_ACCEPTED)
                
        except Exception as e:
            logger.error(f"Error confirming subscription payment: {e}")
            return Response(
                {'error': 'Failed to confirm subscription status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
            stripe_client.initialize()
            try:
                import stripe
                stripe.Subscription.modify(
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
        
        # Use WebhookService to handle events
        from payments.services import WebhookService
        webhook_service = WebhookService()
        
        # Handle specific event types
        event_type = event['type']
        event_data = event['data']['object']
        
        try:
            if event_type == 'payment_intent.succeeded':
                webhook_service.handle_payment_success(event_data)
            elif event_type == 'payment_intent.payment_failed':
                webhook_service.handle_payment_failure(event_data)
            elif event_type == 'customer.subscription.created':
                webhook_service.handle_subscription_created(event_data)
            elif event_type == 'customer.subscription.updated':
                webhook_service.handle_subscription_updated(event_data)
            elif event_type == 'customer.subscription.deleted':
                webhook_service.handle_subscription_deleted(event_data)
            elif event_type == 'charge.refunded':
                webhook_service.handle_refund_created(event_data)
            elif event_type == 'account.updated':
                webhook_service.handle_connect_account_update(event_data)
            elif event_type == 'payout.paid':
                self._handle_payout_paid(event_data)  # Keep for now - not in service
            elif event_type == 'payout.failed':
                self._handle_payout_failed(event_data)  # Keep for now - not in service
            elif event_type == 'invoice.payment_succeeded':
                self._handle_invoice_payment_succeeded(event_data)  # Keep for now - not in service
            elif event_type == 'invoice.payment_failed':
                self._handle_invoice_payment_failed(event_data)  # Keep for now - not in service
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
        subscription_type = metadata.get('type')
        
        if subscription_type == 'stream':
            # Handle stream subscription
            stream_id = metadata.get('stream_id')
            user_id = metadata.get('user_id')
            tier = metadata.get('tier')
            
            if stream_id and user_id:
                from streams.models import Stream, StreamSubscription
                
                # Get the price from subscription items
                price_id = subscription['items']['data'][0]['price']['id']
                price_cents = subscription['items']['data'][0]['price']['unit_amount']
                
                # Create or update stream subscription
                stream_sub, created = StreamSubscription.objects.update_or_create(
                    user_id=user_id,
                    stream_id=stream_id,
                    defaults={
                        'tier': tier,
                        'status': 'active',
                        'stripe_subscription_id': subscription['id'],
                        'stripe_customer_id': subscription['customer'],
                        'stripe_price_id': price_id,
                        'price_cents': price_cents,
                        'current_period_start': timezone.datetime.fromtimestamp(
                            subscription['current_period_start'], 
                            tz=timezone.utc
                        ),
                        'current_period_end': timezone.datetime.fromtimestamp(
                            subscription['current_period_end'], 
                            tz=timezone.utc
                        ),
                        'started_at': timezone.now()
                    }
                )
                
                # Update stream subscriber counts
                stream = Stream.objects.get(id=stream_id)
                stream.subscriber_count = stream.subscriptions.filter(
                    status='active'
                ).count()
                stream.paid_subscriber_count = stream.subscriptions.filter(
                    status='active',
                    tier__in=['entry', 'premium']
                ).count()
                stream.save()
                
        elif metadata.get('practitioner_id'):
            # Handle practitioner platform subscription (existing code)
            practitioner_id = metadata.get('practitioner_id')
            
            # Update subscription record
            sub = PractitionerSubscription.objects.filter(
                practitioner_id=practitioner_id,
                stripe_subscription_id=subscription['id']
            ).first()
            
            if sub:
                sub.status = 'active'
                sub.save()
                
                # Update practitioner's current subscription
                practitioner = sub.practitioner
                practitioner.current_subscription = sub
                practitioner.save(update_fields=['current_subscription'])
    
    def _handle_subscription_updated(self, subscription):
        """Handle subscription update"""
        metadata = subscription.get('metadata', {})
        subscription_type = metadata.get('type')
        
        if subscription_type == 'stream':
            # Handle stream subscription update
            from streams.models import StreamSubscription
            
            stream_sub = StreamSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).first()
            
            if stream_sub:
                # Update subscription status
                stripe_status_map = {
                    'active': 'active',
                    'canceled': 'canceled',
                    'past_due': 'past_due',
                    'trialing': 'active',  # Map trialing to active for streams
                    'unpaid': 'past_due'
                }
                
                new_status = stripe_status_map.get(subscription['status'], 'active')
                stream_sub.status = new_status
                
                # Update period dates
                stream_sub.current_period_start = timezone.datetime.fromtimestamp(
                    subscription['current_period_start'], 
                    tz=timezone.utc
                )
                stream_sub.current_period_end = timezone.datetime.fromtimestamp(
                    subscription['current_period_end'], 
                    tz=timezone.utc
                )
                
                # Handle cancellation
                if subscription.get('cancel_at_period_end'):
                    stream_sub.canceled_at = timezone.now()
                    stream_sub.ends_at = stream_sub.current_period_end
                
                stream_sub.save()
                
                # Update stream subscriber counts
                stream = stream_sub.stream
                stream.subscriber_count = stream.subscriptions.filter(
                    status='active'
                ).count()
                stream.paid_subscriber_count = stream.subscriptions.filter(
                    status='active',
                    tier__in=['entry', 'premium']
                ).count()
                stream.save()
                
        else:
            # Handle practitioner platform subscription (existing code)
            sub = PractitionerSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).first()
            
            if sub:
                # Update subscription status
                stripe_status_map = {
                    'active': 'active',
                    'canceled': 'canceled',
                    'past_due': 'past_due',
                    'trialing': 'trialing',
                    'unpaid': 'unpaid'
                }
                
                new_status = stripe_status_map.get(subscription['status'], 'active')
                sub.status = new_status
                sub.save()
                
                # Update practitioner's current subscription if status changed
                practitioner = sub.practitioner
                if new_status in ['canceled', 'past_due', 'unpaid']:
                    if practitioner.current_subscription == sub:
                        practitioner.current_subscription = None
                        practitioner.save(update_fields=['current_subscription'])
                elif new_status == 'active':
                    practitioner.current_subscription = sub
                    practitioner.save(update_fields=['current_subscription'])
    
    def _handle_subscription_deleted(self, subscription):
        """Handle subscription cancellation"""
        metadata = subscription.get('metadata', {})
        subscription_type = metadata.get('type')
        
        if subscription_type == 'stream':
            # Handle stream subscription deletion
            from streams.models import StreamSubscription
            
            stream_sub = StreamSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).first()
            
            if stream_sub:
                stream_sub.status = 'canceled'
                stream_sub.canceled_at = timezone.now()
                stream_sub.ends_at = timezone.now()
                stream_sub.save()
                
                # Update stream subscriber counts
                stream = stream_sub.stream
                stream.subscriber_count = stream.subscriptions.filter(
                    status='active'
                ).count()
                stream.paid_subscriber_count = stream.subscriptions.filter(
                    status='active',
                    tier__in=['entry', 'premium']
                ).count()
                stream.save()
                
        else:
            # Handle practitioner platform subscription (existing code)
            sub = PractitionerSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).first()
            
            if sub:
                sub.status = 'canceled'
                sub.end_date = timezone.now()
                sub.save()
                
                # Clear practitioner's current subscription if this was it
                practitioner = sub.practitioner
                if practitioner.current_subscription == sub:
                    practitioner.current_subscription = None
                    practitioner.save(update_fields=['current_subscription'])
    
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
    
    def _handle_invoice_payment_succeeded(self, invoice):
        """Handle successful invoice payment (subscription renewals)"""
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Check subscription metadata to determine type
        try:
            import stripe
            subscription = stripe.Subscription.retrieve(subscription_id)
            metadata = subscription.get('metadata', {})
            subscription_type = metadata.get('type')
            
            if subscription_type == 'stream':
                # Handle stream subscription renewal
                from streams.models import StreamSubscription
                
                stream_sub = StreamSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if stream_sub:
                    # Update subscription period dates
                    stream_sub.current_period_start = timezone.datetime.fromtimestamp(
                        subscription['current_period_start'], 
                        tz=timezone.utc
                    )
                    stream_sub.current_period_end = timezone.datetime.fromtimestamp(
                        subscription['current_period_end'], 
                        tz=timezone.utc
                    )
                    stream_sub.status = 'active'
                    stream_sub.save()
                    
                    # Create earnings transaction for practitioner
                    stream = stream_sub.stream
                    practitioner = stream.practitioner
                    
                    # Calculate commission (platform takes 15%)
                    gross_amount_cents = invoice['amount_paid']
                    commission_rate = 15.0  # Platform commission for streams
                    commission_amount_cents = int(gross_amount_cents * commission_rate / 100)
                    net_amount_cents = gross_amount_cents - commission_amount_cents
                    
                    # Create earnings transaction
                    EarningsTransaction.objects.create(
                        practitioner=practitioner,
                        gross_amount_cents=gross_amount_cents,
                        commission_rate=commission_rate,
                        commission_amount_cents=commission_amount_cents,
                        net_amount_cents=net_amount_cents,
                        status='pending',
                        available_after=timezone.now() + timezone.timedelta(hours=48),
                        description=f"Stream subscription renewal - {stream_sub.user.get_full_name() or stream_sub.user.email} ({stream_sub.tier} tier)",
                        metadata={
                            'type': 'stream_subscription',
                            'stream_id': str(stream.id),
                            'subscription_id': str(stream_sub.id),
                            'user_id': str(stream_sub.user.id),
                            'tier': stream_sub.tier,
                            'invoice_id': invoice['id']
                        }
                    )
                    
            else:
                # Handle practitioner platform subscription renewal
                sub = PractitionerSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if sub:
                    # Ensure subscription is marked as active
                    sub.status = 'active'
                    sub.save()
                    
        except Exception as e:
            logger.error(f"Error handling invoice.payment_succeeded: {e}")
    
    def _handle_invoice_payment_failed(self, invoice):
        """Handle failed invoice payment (subscription payment failures)"""
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Check subscription metadata to determine type
        try:
            import stripe
            subscription = stripe.Subscription.retrieve(subscription_id)
            metadata = subscription.get('metadata', {})
            subscription_type = metadata.get('type')
            
            if subscription_type == 'stream':
                # Handle stream subscription payment failure
                from streams.models import StreamSubscription
                
                stream_sub = StreamSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if stream_sub:
                    # Mark subscription as past due
                    stream_sub.status = 'past_due'
                    stream_sub.save()
                    
                    # Update stream subscriber counts
                    stream = stream_sub.stream
                    stream.subscriber_count = stream.subscriptions.filter(
                        status='active'
                    ).count()
                    stream.paid_subscriber_count = stream.subscriptions.filter(
                        status='active',
                        tier__in=['entry', 'premium']
                    ).count()
                    stream.save()
                    
                    # TODO: Send notification to user about payment failure
                    
            else:
                # Handle practitioner platform subscription payment failure
                sub = PractitionerSubscription.objects.filter(
                    stripe_subscription_id=subscription_id
                ).first()
                
                if sub:
                    # Mark subscription as past due
                    sub.status = 'past_due'
                    sub.save()
                    
                    # Clear practitioner's current subscription if this was it
                    practitioner = sub.practitioner
                    if practitioner.current_subscription == sub:
                        practitioner.current_subscription = None
                        practitioner.save(update_fields=['current_subscription'])
                        
        except Exception as e:
            logger.error(f"Error handling invoice.payment_failed: {e}")


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
        from payments.commission_services import CommissionCalculator
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
        
        from payments.commission_services import CommissionCalculator
        calculator = CommissionCalculator()
        
        result = calculator.calculate_commission(
            practitioner=request.user.practitioner_profile,
            service_type=service_type,
            gross_amount=gross_amount
        )
        
        return Response(result)