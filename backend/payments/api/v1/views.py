from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.payments.models import (
    Order, CreditTransaction, PaymentMethod, 
    PractitionerCreditTransaction, PractitionerPayout, UserCreditBalance
)
from apps.payments.api.v1.serializers import (
    OrderSerializer, OrderCreateSerializer,
    CreditTransactionSerializer, CreditTransactionCreateSerializer,
    PaymentMethodSerializer, PaymentMethodCreateSerializer,
    PractitionerCreditTransactionSerializer,
    PractitionerPayoutSerializer,
    UserCreditBalanceSerializer
)
from apps.utils.permissions import IsOwnerOrAdmin, IsAdminOrReadOnly


class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing orders.
    """
    queryset = Order.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'user', 'practitioner', 'service', 'order_type']
    ordering_fields = ['created_at', 'updated_at', 'amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrderCreateSerializer
        return OrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)

    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', description='Filter by order status', required=False, type=str),
            OpenApiParameter(name='order_type', description='Filter by order type', required=False, type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """
        Process payment for an order.
        """
        order = self.get_object()
        
        # Implement payment processing logic here
        # This would typically involve Stripe or another payment processor
        
        return Response({'status': 'payment processing initiated'}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """
        Refund an order.
        """
        order = self.get_object()
        
        # Implement refund logic here
        
        return Response({'status': 'refund initiated'}, status=status.HTTP_202_ACCEPTED)


class CreditTransactionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing credit transactions.
    """
    queryset = CreditTransaction.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['transaction_type', 'user', 'practitioner', 'service', 'is_expired']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CreditTransactionCreateSerializer
        return CreditTransactionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)

    @extend_schema(
        parameters=[
            OpenApiParameter(name='transaction_type', description='Filter by transaction type', required=False, type=str),
            OpenApiParameter(name='is_expired', description='Filter by expiration status', required=False, type=bool),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        """
        Get the current credit balance for the authenticated user.
        """
        user = request.user
        try:
            balance = UserCreditBalance.objects.get(user=user)
            serializer = UserCreditBalanceSerializer(balance)
            return Response(serializer.data)
        except UserCreditBalance.DoesNotExist:
            return Response({'current_balance': 0, 'currency': 'USD'})


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing payment methods.
    """
    queryset = PaymentMethod.objects.filter(is_deleted=False)
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'brand', 'is_default']
    ordering_fields = ['created_at']
    ordering = ['-is_default', '-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentMethodCreateSerializer
        return PaymentMethodSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)

    def perform_destroy(self, instance):
        # Soft delete payment method
        instance.is_deleted = True
        instance.save()

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """
        Set a payment method as the default.
        """
        payment_method = self.get_object()
        user = payment_method.user
        
        # Remove default status from all other payment methods
        PaymentMethod.objects.filter(user=user, is_default=True).update(is_default=False)
        
        # Set this payment method as default
        payment_method.is_default = True
        payment_method.save()
        
        serializer = self.get_serializer(payment_method)
        return Response(serializer.data)


class PractitionerCreditTransactionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing practitioner credit transactions.
    """
    queryset = PractitionerCreditTransaction.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['practitioner', 'payout_status', 'payout']
    ordering_fields = ['created_at', 'credits_earned', 'net_credits']
    ordering = ['-created_at']
    serializer_class = PractitionerCreditTransactionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        
        # Practitioners can only see their own transactions
        try:
            practitioner = user.practitioner
            return self.queryset.filter(practitioner=practitioner)
        except:
            return self.queryset.none()

    @extend_schema(
        parameters=[
            OpenApiParameter(name='payout_status', description='Filter by payout status', required=False, type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class PractitionerPayoutViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing practitioner payouts.
    """
    queryset = PractitionerPayout.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['practitioner', 'status', 'batch_id']
    ordering_fields = ['created_at', 'payout_date', 'cash_payout']
    ordering = ['-created_at']
    serializer_class = PractitionerPayoutSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        
        # Practitioners can only see their own payouts
        try:
            practitioner = user.practitioner
            return self.queryset.filter(practitioner=practitioner)
        except:
            return self.queryset.none()

    @extend_schema(
        parameters=[
            OpenApiParameter(name='status', description='Filter by payout status', required=False, type=str),
            OpenApiParameter(name='batch_id', description='Filter by batch ID', required=False, type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def process_payout(self, request, pk=None):
        """
        Process a payout to a practitioner.
        """
        payout = self.get_object()
        
        # Implement payout processing logic here
        # This would typically involve Stripe Connect or another payment processor
        
        return Response({'status': 'payout processing initiated'}, status=status.HTTP_202_ACCEPTED)


class UserCreditBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing user credit balances.
    """
    queryset = UserCreditBalance.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user']
    serializer_class = UserCreditBalanceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        return self.queryset.filter(user=user)
