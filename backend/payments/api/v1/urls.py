"""
URL configuration for payments API v1
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentMethodViewSet,
    PaymentViewSet,
    CheckoutViewSet,
    CreditViewSet,
    PayoutViewSet,
    SubscriptionViewSet,
    CommissionViewSet,
    WebhookView
)

app_name = 'payments'

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'payment-methods', PaymentMethodViewSet, basename='paymentmethod')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'checkout', CheckoutViewSet, basename='checkout')
router.register(r'credits', CreditViewSet, basename='credit')
router.register(r'payouts', PayoutViewSet, basename='payout')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'commission', CommissionViewSet, basename='commission')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Webhook endpoint
    path('webhooks/stripe/', WebhookView.as_view(), name='stripe-webhook'),
    
    # Additional credit endpoints (not part of viewset)
    path('credits/balance/', CreditViewSet.as_view({'get': 'balance'}), name='credit-balance'),
    path('credits/transactions/', CreditViewSet.as_view({'get': 'transactions'}), name='credit-transactions'),
    path('credits/purchase/', CreditViewSet.as_view({'post': 'purchase'}), name='credit-purchase'),
    path('credits/transfer/', CreditViewSet.as_view({'post': 'transfer'}), name='credit-transfer'),
    
    # Additional payout endpoints (request_payout only - others use router with url_path)
    path('payouts/request/', PayoutViewSet.as_view({'post': 'request_payout'}), name='request-payout'),
    
    # Subscription tier listing
    path('subscriptions/tiers/', SubscriptionViewSet.as_view({'get': 'tiers'}), name='subscription-tiers'),
    
    # Commission endpoints
    path('commission/rates/', CommissionViewSet.as_view({'get': 'rates'}), name='commission-rates'),
    path('commission/calculate/', CommissionViewSet.as_view({'post': 'calculate'}), name='commission-calculate'),
]