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
    
    @action(detail=False, methods=['post'])
    def direct_payment(self, request):
        """Process direct payment with saved payment method"""
        serializer = DirectPaymentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        data = serializer.validated_data
        
        # Get service and payment method
        service = get_object_or_404(Service, id=data['service_id'])  # Now using integer ID
        payment_method = get_object_or_404(PaymentMethod, id=data['payment_method_id'], user=user)
        
        # Calculate amounts
        service_price_cents = int(service.price * 100)
        credits_to_apply_cents = 0
        
        # Apply credits if requested
        if data.get('apply_credits', True):
            user_balance = UserCreditBalance.objects.filter(user=user).first()
            if user_balance and user_balance.balance_cents > 0:
                credits_to_apply_cents = min(user_balance.balance_cents, service_price_cents)
        
        amount_to_charge_cents = service_price_cents - credits_to_apply_cents
        
        # Create order record
        order = Order.objects.create(
            user=user,
            payment_method='stripe',
            stripe_payment_method_id=payment_method.stripe_payment_method_id,
            subtotal_amount_cents=service_price_cents,
            credits_applied_cents=credits_to_apply_cents,
            total_amount_cents=amount_to_charge_cents,
            status='pending',
            order_type='direct',
            service=service,
            practitioner=service.primary_practitioner,
            metadata={
                'special_requests': data.get('special_requests', ''),
                'payment_method_id': str(payment_method.id)
            }
        )
        
        try:
            if amount_to_charge_cents > 0:
                # Initialize Stripe and create payment intent
                stripe_client = StripeClient()
                stripe_client.initialize()
                
                # Ensure user has Stripe customer
                if not hasattr(user, 'payment_profile') or not user.payment_profile.stripe_customer_id:
                    from users.models import UserPaymentProfile
                    profile, created = UserPaymentProfile.objects.get_or_create(user=user)
                    if not profile.stripe_customer_id:
                        customer = stripe_client.create_customer(user)
                        profile.stripe_customer_id = customer.id
                        profile.save()
                
                # Create and confirm payment intent
                payment_intent = stripe.PaymentIntent.create(
                    amount=amount_to_charge_cents,
                    currency='usd',
                    customer=user.payment_profile.stripe_customer_id,
                    payment_method=payment_method.stripe_payment_method_id,
                    payment_method_types=['card'],  # Only accept card payments
                    confirm=True,
                    automatic_payment_methods={
                        'enabled': False  # Don't use automatic payment methods
                    },
                    metadata={
                        'order_id': str(order.id),
                        'user_id': str(user.id),
                        'service_id': str(service.id),
                        'practitioner_id': str(service.primary_practitioner.id) if service.primary_practitioner else None
                    }
                )
                
                order.stripe_payment_intent_id = payment_intent.id
                order.save()
                
                if payment_intent.status == 'succeeded':
                    # Payment successful
                    order.status = 'completed'
                    order.save()
                    
                    # Create paired credit transactions for service booking
                    # 1. Purchase transaction (money in)
                    UserCreditTransaction.objects.create(
                        user=user,
                        amount_cents=service_price_cents,  # Full service price
                        transaction_type='purchase',
                        service=service,
                        practitioner=service.primary_practitioner,
                        order=order,
                        description=f"Purchase: {service.name}"
                    )
                    
                    # 2. Usage transaction (service booked)
                    UserCreditTransaction.objects.create(
                        user=user,
                        amount_cents=-service_price_cents,  # Negative for usage
                        transaction_type='usage',
                        service=service,
                        practitioner=service.primary_practitioner,
                        order=order,
                        description=f"Booking: {service.name}"
                    )
                    
                    # Create booking based on service type
                    from bookings.models import Booking, BookingFactory
                    from services.models import ServiceSession
                    
                    service_type_code = service.service_type.code
                    
                    if service_type_code == 'session':
                        # Individual session booking
                        booking = Booking.objects.create(
                            user=user,
                            service=service,
                            practitioner=service.primary_practitioner,
                            price_charged_cents=amount_to_charge_cents + credits_to_apply_cents,
                            discount_amount_cents=credits_to_apply_cents,
                            final_amount_cents=amount_to_charge_cents,
                            status='confirmed',
                            payment_status='paid',
                            client_notes=data.get('special_requests', ''),
                            start_time=data['start_time'],
                            end_time=data['end_time'],
                            timezone=data.get('timezone', 'UTC'),
                            service_name_snapshot=service.name,
                            service_description_snapshot=service.description or '',
                            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
                            confirmed_at=timezone.now()
                        )
                    
                    elif service_type_code == 'workshop':
                        # Workshop booking with service session
                        service_session = get_object_or_404(ServiceSession, id=data['service_session_id'])
                        booking = Booking.objects.create(
                            user=user,
                            service=service,
                            practitioner=service.primary_practitioner,
                            service_session=service_session,
                            price_charged_cents=amount_to_charge_cents + credits_to_apply_cents,
                            discount_amount_cents=credits_to_apply_cents,
                            final_amount_cents=amount_to_charge_cents,
                            status='confirmed',
                            payment_status='paid',
                            client_notes=data.get('special_requests', ''),
                            start_time=service_session.start_time,
                            end_time=service_session.end_time,
                            timezone=data.get('timezone', 'UTC'),
                            service_name_snapshot=service.name,
                            service_description_snapshot=service.description or '',
                            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
                            confirmed_at=timezone.now(),
                            max_participants=service_session.max_participants
                        )
                    
                    elif service_type_code == 'course':
                        # Course enrollment - use BookingFactory
                        booking = BookingFactory.create_course_booking(
                            user=user,
                            course=service,
                            payment_intent_id=order.stripe_payment_intent_id,
                            client_notes=data.get('special_requests', '')
                        )
                        booking.payment_status = 'paid'
                        booking.save()
                    
                    elif service_type_code == 'package':
                        # Package purchase - use BookingFactory
                        # For packages, we need the first session time if provided
                        first_session_time = data.get('start_time')
                        booking = BookingFactory.create_package_booking(
                            user=user,
                            package=service,
                            payment_intent_id=order.stripe_payment_intent_id,
                            client_notes=data.get('special_requests', '')
                        )
                        booking.payment_status = 'paid'
                        booking.save()
                        
                        # If first session time provided, update the first child booking
                        if first_session_time and booking.child_bookings.exists():
                            first_child = booking.child_bookings.first()
                            first_child.start_time = first_session_time
                            first_child.end_time = data.get('end_time', first_session_time + timezone.timedelta(hours=1))
                            first_child.status = 'scheduled'
                            first_child.save()
                    
                    elif service_type_code == 'bundle':
                        # Bundle purchase - use BookingFactory
                        # For bundles, we need the first session time if provided
                        first_session_time = data.get('start_time')
                        booking = BookingFactory.create_bundle_booking(
                            user=user,
                            bundle=service,
                            payment_intent_id=order.stripe_payment_intent_id,
                            client_notes=data.get('special_requests', '')
                        )
                        booking.payment_status = 'paid'
                        booking.save()
                        
                        # Create the first scheduled booking if time provided
                        if first_session_time:
                            # Create first booking from bundle
                            first_booking = Booking.objects.create(
                                user=user,
                                service=service,
                                practitioner=service.primary_practitioner,
                                parent_booking=booking,
                                price_charged_cents=0,  # Using bundle credits
                                discount_amount_cents=0,
                                final_amount_cents=0,
                                status='scheduled',
                                payment_status='paid',
                                client_notes=data.get('special_requests', ''),
                                start_time=first_session_time,
                                end_time=data.get('end_time', first_session_time + timezone.timedelta(hours=1)),
                                timezone=data.get('timezone', 'UTC'),
                                service_name_snapshot=service.name,
                                service_description_snapshot=service.description or '',
                                practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else ''
                            )
                    
                    else:
                        # Default case - standard booking
                        booking = Booking.objects.create(
                            user=user,
                            service=service,
                            practitioner=service.primary_practitioner,
                            price_charged_cents=amount_to_charge_cents + credits_to_apply_cents,
                            discount_amount_cents=credits_to_apply_cents,
                            final_amount_cents=amount_to_charge_cents,
                            status='confirmed',
                            payment_status='paid',
                            client_notes=data.get('special_requests', ''),
                            start_time=data.get('start_time', timezone.now()),
                            end_time=data.get('end_time', timezone.now() + timezone.timedelta(hours=1)),
                            timezone=data.get('timezone', 'UTC'),
                            service_name_snapshot=service.name,
                            service_description_snapshot=service.description or '',
                            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
                            confirmed_at=timezone.now()
                        )
                    
                    # Create earnings for practitioner
                    if service.primary_practitioner:
                        from payments.services import CommissionCalculator
                        calculator = CommissionCalculator()
                        
                        # Get commission rate
                        commission_rate = calculator.get_commission_rate(
                            practitioner=service.primary_practitioner,
                            service_type=service.service_type
                        )
                        
                        # Calculate commission and net amounts
                        commission_amount_cents = int((commission_rate / 100) * service_price_cents)
                        net_amount_cents = service_price_cents - commission_amount_cents
                        
                        EarningsTransaction.objects.create(
                            practitioner=service.primary_practitioner,
                            booking=booking,
                            gross_amount_cents=service_price_cents,
                            commission_rate=commission_rate,
                            commission_amount_cents=commission_amount_cents,
                            net_amount_cents=net_amount_cents,
                            status='pending',
                            available_after=timezone.now() + timezone.timedelta(hours=48),
                            description=f"Earnings from booking for {service.name}"
                        )
                    
                    return Response({
                        'status': 'success',
                        'order_id': str(order.id),
                        'booking_id': str(booking.id) if booking else None,
                        'payment_intent_id': payment_intent.id,
                        'amount_charged': amount_to_charge_cents / 100,
                        'credits_applied': credits_to_apply_cents / 100
                    })
                else:
                    # Payment requires additional action
                    order.status = 'processing'
                    order.save()
                    return Response({
                        'status': 'requires_action',
                        'order_id': str(order.id),
                        'payment_intent_id': payment_intent.id,
                        'client_secret': payment_intent.client_secret
                    })
            else:
                # No payment needed, only credits used
                order.status = 'completed'
                order.save()
                
                # Create paired credit transactions for service booking
                # 1. Purchase transaction (conceptual - representing the service value)
                UserCreditTransaction.objects.create(
                    user=user,
                    amount_cents=service_price_cents,  # Full service price
                    transaction_type='purchase',
                    service=service,
                    practitioner=service.primary_practitioner,
                    order=order,
                    description=f"Purchase: {service.name}"
                )
                
                # 2. Usage transaction (actual credits used)
                UserCreditTransaction.objects.create(
                    user=user,
                    amount_cents=-service_price_cents,  # Negative for usage
                    transaction_type='usage',
                    service=service,
                    practitioner=service.primary_practitioner,
                    order=order,
                    description=f"Booking: {service.name}"
                )
                
                # Create booking using same logic as paid bookings
                from bookings.models import Booking, BookingFactory
                from services.models import ServiceSession
                
                service_type_code = service.service_type.code
                
                # Use the same booking creation logic but with credits-only pricing
                booking_params = {
                    'user': user,
                    'service': service,
                    'practitioner': service.primary_practitioner,
                    'price_charged_cents': credits_to_apply_cents,
                    'discount_amount_cents': 0,
                    'final_amount_cents': 0,  # Paid entirely with credits
                    'status': 'confirmed',
                    'payment_status': 'paid',
                    'client_notes': data.get('special_requests', ''),
                    'service_name_snapshot': service.name,
                    'service_description_snapshot': service.description or '',
                    'practitioner_name_snapshot': service.primary_practitioner.display_name if service.primary_practitioner else '',
                    'confirmed_at': timezone.now()
                }
                
                if service_type_code == 'session':
                    # Individual session booking
                    booking_params.update({
                        'start_time': data['start_time'],
                        'end_time': data['end_time'],
                        'timezone': data.get('timezone', 'UTC')
                    })
                    booking = Booking.objects.create(**booking_params)
                
                elif service_type_code == 'workshop':
                    # Workshop booking with service session
                    service_session = get_object_or_404(ServiceSession, id=data['service_session_id'])
                    booking_params.update({
                        'service_session': service_session,
                        'start_time': service_session.start_time,
                        'end_time': service_session.end_time,
                        'timezone': data.get('timezone', 'UTC'),
                        'max_participants': service_session.max_participants
                    })
                    booking = Booking.objects.create(**booking_params)
                
                elif service_type_code in ['course', 'package', 'bundle']:
                    # Use BookingFactory for complex service types
                    # These methods need to be updated to handle credits-only payments
                    # For now, create a simple booking for complex types
                    # TODO: Implement proper complex booking handling
                    booking_params.update({
                        'start_time': data.get('start_time', timezone.now()),
                        'end_time': data.get('end_time', timezone.now() + timezone.timedelta(hours=1)),
                        'timezone': data.get('timezone', 'UTC')
                    })
                    booking = Booking.objects.create(**booking_params)
                
                else:
                    # Default case - standard booking
                    booking_params.update({
                        'start_time': data.get('start_time', timezone.now()),
                        'end_time': data.get('end_time', timezone.now() + timezone.timedelta(hours=1)),
                        'timezone': data.get('timezone', 'UTC')
                    })
                    booking = Booking.objects.create(**booking_params)
                
                return Response({
                    'status': 'success',
                    'order_id': str(order.id),
                    'booking_id': str(booking.id),
                    'amount_charged': 0,
                    'credits_applied': credits_to_apply_cents / 100
                })
                
        except Exception as e:
            # Payment failed
            order.status = 'failed'
            order.save()
            logger.error(f"Payment failed for order {order.id}: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Payment processing failed',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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
        amount_cents = int(amount * 100)
        stripe_client = StripeClient()
        
        # Create order record for tracking
        order = Order.objects.create(
            user=request.user,
            payment_method='stripe',
            subtotal_amount_cents=amount_cents,
            total_amount_cents=amount_cents,
            status='pending',
            order_type='credit',
            metadata={
                'credit_amount': amount,
                'description': f'Purchase of ${amount} credits'
            }
        )
        
        # Create payment intent
        intent = stripe_client.payment_intents.create(
            amount=amount_cents,
            currency='usd',
            payment_method=serializer.validated_data.get('payment_method_id'),
            customer=request.user.payment_profile.stripe_customer_id,
            metadata={
                'order_id': str(order.id),
                'user_id': str(request.user.id),
                'type': 'credit_purchase',
                'credit_amount': str(amount)
            },
            confirm=True if serializer.validated_data.get('payment_method_id') else False
        )
        
        order.stripe_payment_intent_id = intent.id
        order.save()
        
        # If payment succeeded immediately, process it
        if intent.status == 'succeeded':
            order.status = 'completed'
            order.save()
            
            # Create credit transaction
            UserCreditTransaction.objects.create(
                user=request.user,
                amount_cents=amount_cents,
                transaction_type='purchase',
                description=f"Credit purchase - Order #{order.id}",
                order=order
            )
            
            return Response({
                'payment_intent_id': intent.id,
                'status': 'success',
                'order_id': str(order.id),
                'credits_added': amount
            })
        
        return Response({
            'payment_intent_id': intent.id,
            'client_secret': intent.client_secret,
            'status': intent.status,
            'order_id': str(order.id)
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
            elif event_type == 'customer.subscription.updated':
                self._handle_subscription_updated(event_data)
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
            elif event_type == 'invoice.payment_succeeded':
                self._handle_invoice_payment_succeeded(event_data)
            elif event_type == 'invoice.payment_failed':
                self._handle_invoice_payment_failed(event_data)
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