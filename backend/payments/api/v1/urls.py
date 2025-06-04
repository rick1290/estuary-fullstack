from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.payments.api.v1.views import (
    OrderViewSet, CreditTransactionViewSet, PaymentMethodViewSet,
    PractitionerCreditTransactionViewSet, PractitionerPayoutViewSet,
    UserCreditBalanceViewSet
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'credit-transactions', CreditTransactionViewSet, basename='credit-transaction')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'practitioner-credit-transactions', PractitionerCreditTransactionViewSet, basename='practitioner-credit-transaction')
router.register(r'practitioner-payouts', PractitionerPayoutViewSet, basename='practitioner-payout')
router.register(r'user-credit-balances', UserCreditBalanceViewSet, basename='user-credit-balance')

urlpatterns = [
    path('', include(router.urls)),
]
