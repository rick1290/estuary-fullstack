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
        
        try:
            # Use fast orchestrator by default (can be controlled by feature flag)
            use_fast_checkout = True  # TODO: Move to settings or feature flag
            
            if use_fast_checkout:
                from payments.services.checkout_orchestrator_fast import FastCheckoutOrchestrator
                orchestrator = FastCheckoutOrchestrator()
                result = orchestrator.process_booking_payment_fast(
                    user=request.user,
                    service_id=serializer.validated_data['service_id'],
                    payment_method_id=serializer.validated_data['payment_method_id'],
                    booking_data=serializer.validated_data
                )
            else:
                orchestrator = CheckoutOrchestrator()
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
    
    @action(detail=False, methods=['get'], url_path='earnings/balance')
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
    
    @action(detail=False, methods=['get'], url_path='earnings/transactions')
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

    @action(detail=False, methods=['get'], url_path='earnings/purchases')
    def earnings_purchases(self, request):
        """
        List practitioner's earnings grouped by purchase/order.
        Shows the full picture: Order → Bookings → Earnings
        """
        if not hasattr(request.user, 'practitioner_profile'):
            return Response(
                {'error': 'Not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )

        practitioner = request.user.practitioner_profile
        from collections import defaultdict

        # Get all bookings for this practitioner with related data
        bookings_qs = Booking.objects.filter(
            practitioner=practitioner,
            order__isnull=False
        ).select_related(
            'order', 'user', 'service', 'service__service_type', 'service_session'
        ).prefetch_related(
            'earnings_transactions'
        ).order_by('-order__created_at', '-created_at')

        # Filter by status if provided
        status_filter = request.query_params.get('status')

        # Group bookings by order
        orders_dict = defaultdict(lambda: {
            'order': None,
            'client': None,
            'service': None,
            'bookings': [],
            'summary': {
                'total_sessions': 0,
                'completed_sessions': 0,
                'total_credits_cents': 0,
                'total_gross_cents': 0,
                'total_commission_cents': 0,
                'total_net_cents': 0,
                'earnings_by_status': defaultdict(int)
            }
        })

        for booking in bookings_qs:
            if not booking.order:
                continue

            order_id = booking.order.id
            order_data = orders_dict[order_id]

            # Set order info (once per order)
            if order_data['order'] is None:
                order_data['order'] = {
                    'id': booking.order.id,
                    'public_uuid': str(booking.order.public_uuid),
                    'created_at': booking.order.created_at.isoformat(),
                    'total_amount_cents': booking.order.total_amount_cents,
                    'total_amount_display': f"${booking.order.total_amount_cents / 100:,.2f}",
                    'status': booking.order.status,
                    'order_type': booking.order.order_type,
                }

            # Set client info (once per order)
            if order_data['client'] is None and booking.user:
                order_data['client'] = {
                    'id': booking.user.id,
                    'name': booking.user.get_full_name() or booking.user.email,
                    'email': booking.user.email,
                    'avatar_url': getattr(booking.user, 'avatar_url', None) or
                                  (booking.user.profile.avatar_url if hasattr(booking.user, 'profile') and booking.user.profile else None)
                }

            # Set service info (once per order, from first booking)
            if order_data['service'] is None and booking.service:
                order_data['service'] = {
                    'id': booking.service.id,
                    'public_uuid': str(booking.service.public_uuid),
                    'name': booking.service.name,
                    'service_type': booking.service.service_type.code if booking.service.service_type else None,
                    'service_type_name': booking.service.service_type.name if booking.service.service_type else None,
                }

            # Get earnings for this booking
            earnings_tx = booking.earnings_transactions.first()
            earnings_data = None
            if earnings_tx:
                earnings_data = {
                    'id': earnings_tx.id,
                    'public_uuid': str(earnings_tx.public_uuid),
                    'gross_amount_cents': earnings_tx.gross_amount_cents,
                    'gross_amount_display': f"${earnings_tx.gross_amount_cents / 100:,.2f}",
                    'commission_rate': float(earnings_tx.commission_rate),
                    'commission_amount_cents': earnings_tx.commission_amount_cents,
                    'commission_amount_display': f"${earnings_tx.commission_amount_cents / 100:,.2f}",
                    'net_amount_cents': earnings_tx.net_amount_cents,
                    'net_amount_display': f"${earnings_tx.net_amount_cents / 100:,.2f}",
                    'status': earnings_tx.status,
                    'available_after': earnings_tx.available_after.isoformat() if earnings_tx.available_after else None,
                }
                # Update summary
                order_data['summary']['total_gross_cents'] += earnings_tx.gross_amount_cents
                order_data['summary']['total_commission_cents'] += earnings_tx.commission_amount_cents
                order_data['summary']['total_net_cents'] += earnings_tx.net_amount_cents
                order_data['summary']['earnings_by_status'][earnings_tx.status] += earnings_tx.net_amount_cents

            # Build booking data
            session_data = None
            if booking.service_session:
                session_data = {
                    'id': booking.service_session.id,
                    'start_time': booking.service_session.start_time.isoformat() if booking.service_session.start_time else None,
                    'end_time': booking.service_session.end_time.isoformat() if booking.service_session.end_time else None,
                    'sequence_number': getattr(booking.service_session, 'sequence_number', None),
                }

            booking_data = {
                'id': booking.id,
                'public_uuid': str(booking.public_uuid),
                'status': booking.status,
                'payment_status': booking.payment_status,
                'credits_allocated': booking.credits_allocated,
                'credits_allocated_display': f"${booking.credits_allocated / 100:,.2f}" if booking.credits_allocated else "$0.00",
                'service_session': session_data,
                'earnings': earnings_data,
                'created_at': booking.created_at.isoformat(),
            }

            order_data['bookings'].append(booking_data)
            order_data['summary']['total_sessions'] += 1
            order_data['summary']['total_credits_cents'] += booking.credits_allocated or 0
            if booking.status == 'completed':
                order_data['summary']['completed_sessions'] += 1

        # Convert to list and add display fields to summary
        result = []
        for order_id, data in orders_dict.items():
            # Filter by earnings status if requested
            if status_filter:
                has_status = any(
                    b.get('earnings', {}).get('status') == status_filter
                    for b in data['bookings'] if b.get('earnings')
                )
                if not has_status:
                    continue

            # Add display fields to summary
            data['summary']['total_credits_display'] = f"${data['summary']['total_credits_cents'] / 100:,.2f}"
            data['summary']['total_gross_display'] = f"${data['summary']['total_gross_cents'] / 100:,.2f}"
            data['summary']['total_commission_display'] = f"${data['summary']['total_commission_cents'] / 100:,.2f}"
            data['summary']['total_net_display'] = f"${data['summary']['total_net_cents'] / 100:,.2f}"
            data['summary']['earnings_by_status'] = dict(data['summary']['earnings_by_status'])

            result.append(data)

        # Sort by order created_at descending
        result.sort(key=lambda x: x['order']['created_at'] if x['order'] else '', reverse=True)

        # Paginate
        page = self.paginate_queryset(result)
        if page is not None:
            return self.get_paginated_response(page)

        return Response(result)

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