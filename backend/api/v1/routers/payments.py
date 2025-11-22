"""
Payments router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
from asgiref.sync import sync_to_async

from payments.models import (
    Order, UserCreditTransaction, UserCreditBalance, PaymentMethod,
    EarningsTransaction, PractitionerEarnings, PractitionerPayout,
    SubscriptionTier, PractitionerSubscription, ServiceTypeCommission
)
from services.models import Service
from users.models import User
from practitioners.models import Practitioner

from ..schemas.payments import (
    # Orders
    OrderCreate, OrderResponse, OrderListResponse,
    # Payment Methods
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse, PaymentMethodListResponse,
    # Credits
    CreditBalance, CreditPurchase, CreditTransactionResponse, CreditTransactionListResponse, CreditTransfer,
    # Earnings
    PractitionerEarningsBalance, EarningsTransactionResponse, EarningsTransactionListResponse,
    # Payouts
    PayoutRequest, PayoutResponse, PayoutListResponse,
    # Subscriptions
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse, SubscriptionTierResponse,
    # Stripe
    StripePaymentIntent, StripeConnectAccount, StripeAccountLink,
    # Refunds
    RefundRequest, RefundResponse,
    # Reports
    FinancialSummary, CommissionCalculation
)
from api.dependencies import (
    PaginationParams, 
    get_pagination_params,
    get_current_user,
    get_current_superuser,
    get_current_practitioner
)
from ..utils import paginate_queryset
from integrations.stripe.client import StripeClient

router = APIRouter()

# Initialize Stripe client lazily
stripe_client = StripeClient()

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

@sync_to_async
def get_service_by_id(service_id: UUID):
    """Get service by ID"""
    return get_object_or_404(Service, id=service_id)

@sync_to_async
def get_order_by_id_and_user(order_id: UUID, user: User):
    """Get order by ID and user"""
    return get_object_or_404(Order, id=order_id, user=user)

@sync_to_async
def get_order_by_id(order_id: UUID):
    """Get order by ID"""
    return get_object_or_404(Order, id=order_id)

@sync_to_async
def create_order_with_transaction(user: User, order_data: OrderCreate, service: Service = None):
    """Create order within transaction"""
    with transaction.atomic():
        order = Order.objects.create(
            user=user,
            order_type=order_data.order_type,
            payment_method=order_data.payment_method,
            service=service,
            subtotal_amount_cents=int((order_data.credit_amount or service.price) * 100) if order_data.credit_amount or service else 0,
            apply_credits=order_data.apply_credits,
            metadata=order_data.metadata or {}
        )
        return order

@sync_to_async
def save_order(order: Order):
    """Save order"""
    order.save()

@sync_to_async
def get_payment_method_by_id_and_user(payment_method_id: UUID, user: User):
    """Get payment method by ID and user"""
    return get_object_or_404(PaymentMethod, id=payment_method_id, user=user)

@sync_to_async
def check_user_has_payment_methods(user: User):
    """Check if user has payment methods"""
    return PaymentMethod.objects.filter(user=user).exists()

@sync_to_async
def create_payment_method_with_transaction(user: User, payment_method_data: PaymentMethodCreate, stripe_pm, is_default: bool):
    """Create payment method with transaction"""
    with transaction.atomic():
        # Unset other default methods if this is to be default
        if is_default:
            PaymentMethod.objects.filter(user=user, is_default=True).update(is_default=False)
        
        payment_method = PaymentMethod.objects.create(
            user=user,
            stripe_payment_method_id=payment_method_data.stripe_payment_method_id,
            brand=stripe_pm.card.brand,
            last4=stripe_pm.card.last4,
            exp_month=stripe_pm.card.exp_month,
            exp_year=stripe_pm.card.exp_year,
            is_default=is_default
        )
        return payment_method

@sync_to_async
def update_payment_method_with_transaction(user: User, payment_method: PaymentMethod, update_data: PaymentMethodUpdate):
    """Update payment method with transaction"""
    with transaction.atomic():
        if update_data.is_default is True:
            # Unset other default methods
            PaymentMethod.objects.filter(user=user, is_default=True).update(is_default=False)
            payment_method.is_default = True
            payment_method.save()

@sync_to_async
def deactivate_payment_method(payment_method: PaymentMethod):
    """Deactivate payment method"""
    payment_method.is_active = False
    payment_method.save()

@sync_to_async
def get_or_create_credit_balance(user: User):
    """Get or create credit balance"""
    return UserCreditBalance.objects.get_or_create(user=user)

@sync_to_async
def get_user_by_id(user_id: UUID):
    """Get user by ID"""
    return get_object_or_404(User, id=user_id)

@sync_to_async
def transfer_credits_with_transaction(current_user: User, recipient: User, transfer_data: CreditTransfer):
    """Transfer credits with transaction"""
    with transaction.atomic():
        # Debit sender
        UserCreditTransaction.objects.create(
            user=current_user,
            amount_cents=-int(transfer_data.amount * 100),
            transaction_type="transfer",
            description=f"Transfer to {recipient.get_full_name() or recipient.email}",
            metadata={"recipient_user_id": str(recipient.id)}
        )
        
        # Credit recipient
        UserCreditTransaction.objects.create(
            user=recipient,
            amount_cents=int(transfer_data.amount * 100),
            transaction_type="transfer",
            description=f"Transfer from {current_user.get_full_name() or current_user.email}",
            metadata={"sender_user_id": str(current_user.id)}
        )

@sync_to_async
def get_or_create_practitioner_earnings(practitioner: Practitioner):
    """Get or create practitioner earnings"""
    return PractitionerEarnings.objects.get_or_create(practitioner=practitioner)

@sync_to_async
def create_practitioner_payout(practitioner: Practitioner, payout_data: PayoutRequest, payout_amount: Decimal):
    """Create practitioner payout"""
    return PractitionerPayout.objects.create(
        practitioner=practitioner,
        credits_payout_cents=int(payout_amount * 100),
        status="pending",
        payment_method="stripe",
        currency="USD",
        notes=payout_data.notes
    )

@sync_to_async
def save_practitioner(practitioner: Practitioner):
    """Save practitioner"""
    practitioner.save()

@sync_to_async
def create_refund_transaction_with_order_update(order: Order, refund_amount: Decimal):
    """Create refund transaction and update order"""
    with transaction.atomic():
        UserCreditTransaction.objects.create(
            user=order.user,
            amount_cents=int(refund_amount * 100),
            transaction_type="refund",
            description=f"Refund for order {order.public_uuid}",
            order=order
        )
        
        # Update order status
        if refund_amount == order.total_amount:
            order.status = "refunded"
        else:
            order.status = "partially_refunded"
        order.save()

@sync_to_async
def get_batch_payout_count():
    """Get batch payout count"""
    return PractitionerPayout.create_batch_payout()

# =============================================================================
# ORDERS & PAYMENTS
# =============================================================================

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    # Validate service exists if provided
    service = None
    if order_data.service_id:
        service = await get_service_by_id(order_data.service_id)
    
    # Create order
    order = await create_order_with_transaction(current_user, order_data, service)
    
    # Handle Stripe payment
    if order_data.payment_method == "stripe" and order_data.payment_method_id:
        payment_intent = await stripe_client.create_payment_intent(
            amount=order.total_amount_cents,
            currency="usd",
            payment_method=order_data.payment_method_id,
            metadata={"order_id": str(order.id)}
        )
        order.stripe_payment_intent_id = payment_intent.id
        await save_order(order)
    
    return OrderResponse.model_validate(order)


@router.get("/orders", response_model=OrderListResponse)
async def list_orders(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None
):
    """List user's orders"""
    @sync_to_async
    def get_orders_queryset():
        queryset = Order.objects.filter(user=current_user).order_by('-created_at')
        if status:
            queryset = queryset.filter(status=status)
        return queryset
    
    queryset = await get_orders_queryset()
    return await paginate_queryset(queryset, pagination, OrderResponse)


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get order details"""
    order = await get_order_by_id_and_user(order_id, current_user)
    return OrderResponse.model_validate(order)


# =============================================================================
# PAYMENT METHODS
# =============================================================================

@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(
    payment_method_data: PaymentMethodCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a new payment method"""
    # Get payment method details from Stripe
    stripe_pm = await stripe_client.retrieve_payment_method(payment_method_data.stripe_payment_method_id)
    
    # Set as default if requested or if it's the first payment method
    user_has_payment_methods = await check_user_has_payment_methods(current_user)
    is_default = payment_method_data.is_default or not user_has_payment_methods
    
    payment_method = await create_payment_method_with_transaction(current_user, payment_method_data, stripe_pm, is_default)
    
    return PaymentMethodResponse.model_validate(payment_method)


@router.get("/payment-methods", response_model=PaymentMethodListResponse)
async def list_payment_methods(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user)
):
    """List user's payment methods"""
    @sync_to_async
    def get_payment_methods_queryset():
        return PaymentMethod.objects.filter(user=current_user, is_active=True).order_by('-is_default', '-created_at')
    
    queryset = await get_payment_methods_queryset()
    return await paginate_queryset(queryset, pagination, PaymentMethodResponse)


@router.patch("/payment-methods/{payment_method_id}", response_model=PaymentMethodResponse)
async def update_payment_method(
    payment_method_id: UUID,
    update_data: PaymentMethodUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update payment method"""
    payment_method = await get_payment_method_by_id_and_user(payment_method_id, current_user)
    
    await update_payment_method_with_transaction(current_user, payment_method, update_data)
    
    return PaymentMethodResponse.model_validate(payment_method)


@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Delete payment method"""
    payment_method = await get_payment_method_by_id_and_user(payment_method_id, current_user)
    
    # Detach from Stripe
    await stripe_client.detach_payment_method(payment_method.stripe_payment_method_id)
    
    await deactivate_payment_method(payment_method)
    
    return {"message": "Payment method deleted successfully"}


# =============================================================================
# CREDITS
# =============================================================================

@router.get("/credits/balance", response_model=CreditBalance)
async def get_credit_balance(
    current_user: User = Depends(get_current_user)
):
    """Get user's credit balance"""
    balance, created = await get_or_create_credit_balance(current_user)
    return CreditBalance.model_validate(balance)


@router.post("/credits/purchase", response_model=StripePaymentIntent)
async def purchase_credits(
    purchase_data: CreditPurchase,
    current_user: User = Depends(get_current_user)
):
    """Purchase credits"""
    amount_cents = int(purchase_data.amount * 100)
    
    # Get or create customer
    @sync_to_async
    def get_or_create_customer():
        from users.models import UserPaymentProfile
        profile, created = UserPaymentProfile.objects.get_or_create(user=current_user)
        if not profile.stripe_customer_id:
            customer = stripe_client.create_customer(current_user)
            profile.stripe_customer_id = customer.id
            profile.save()
        return profile.stripe_customer_id
    
    customer_id = await get_or_create_customer()
    
    # Create payment intent
    payment_intent = await sync_to_async(stripe_client.create_payment_intent)(
        amount=amount_cents,
        currency="usd",
        customer_id=customer_id,
        metadata={
            "type": "credit_purchase",
            "user_id": str(current_user.id),
            "credit_amount": str(purchase_data.amount)
        }
    )
    
    return StripePaymentIntent(
        client_secret=payment_intent.client_secret,
        payment_intent_id=payment_intent.id,
        amount=amount_cents,
        currency="usd",
        status=payment_intent.status
    )


@router.get("/credits/transactions", response_model=CreditTransactionListResponse)
async def list_credit_transactions(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user)
):
    """List user's credit transactions"""
    @sync_to_async
    def get_credit_transactions_queryset():
        return UserCreditTransaction.objects.filter(user=current_user).order_by('-created_at')
    
    queryset = await get_credit_transactions_queryset()
    
    # Get current balance
    balance, created = await get_or_create_credit_balance(current_user)
    
    paginated_result = await paginate_queryset(queryset, pagination, CreditTransactionResponse)
    paginated_result.current_balance = CreditBalance.model_validate(balance)
    
    return paginated_result


@router.post("/credits/transfer")
async def transfer_credits(
    transfer_data: CreditTransfer,
    current_user: User = Depends(get_current_user)
):
    """Transfer credits to another user"""
    recipient = await get_user_by_id(transfer_data.recipient_user_id)
    
    # Check balance
    balance, created = await get_or_create_credit_balance(current_user)
    if balance.balance < transfer_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient credit balance"
        )
    
    await transfer_credits_with_transaction(current_user, recipient, transfer_data)
    
    return {"message": "Credits transferred successfully"}


# =============================================================================
# PRACTITIONER EARNINGS
# =============================================================================

@router.get("/earnings/balance", response_model=PractitionerEarningsBalance)
async def get_earnings_balance(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get practitioner's earnings balance"""
    earnings, created = await get_or_create_practitioner_earnings(practitioner)
    return PractitionerEarningsBalance.model_validate(earnings)


@router.get("/earnings/transactions", response_model=EarningsTransactionListResponse)
async def list_earnings_transactions(
    pagination: PaginationParams = Depends(),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """List practitioner's earnings transactions"""
    @sync_to_async
    def get_earnings_transactions_queryset():
        return EarningsTransaction.objects.filter(practitioner=practitioner).order_by('-created_at')

    queryset = await get_earnings_transactions_queryset()

    # Get current balance
    earnings, created = await get_or_create_practitioner_earnings(practitioner)

    paginated_result = await paginate_queryset(queryset, pagination, EarningsTransactionResponse)
    paginated_result.current_balance = PractitionerEarningsBalance.model_validate(earnings)

    return paginated_result


# =============================================================================
# PAYOUTS
# =============================================================================

@router.post("/payouts/request", response_model=PayoutResponse)
async def request_payout(
    payout_data: PayoutRequest,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Request a payout"""
    earnings, created = await get_or_create_practitioner_earnings(practitioner)
    
    # Determine payout amount
    payout_amount = payout_data.amount or earnings.available_balance
    
    if payout_amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No funds available for payout"
        )
    
    if payout_amount > earnings.available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested amount exceeds available balance"
        )
    
    # Create payout record
    payout = await create_practitioner_payout(practitioner, payout_data, payout_amount)
    
    return PayoutResponse.model_validate(payout)


@router.get("/payouts", response_model=PayoutListResponse)
async def list_payouts(
    pagination: PaginationParams = Depends(),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """List practitioner's payouts"""
    @sync_to_async
    def get_payouts_queryset():
        return PractitionerPayout.objects.filter(practitioner=practitioner).order_by('-created_at')
    
    queryset = await get_payouts_queryset()
    return await paginate_queryset(queryset, pagination, PayoutResponse)


# =============================================================================
# STRIPE INTEGRATION
# =============================================================================

@router.post("/stripe/payment-intent", response_model=StripePaymentIntent)
async def create_payment_intent(
    order_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Create Stripe payment intent for an order"""
    order = await get_order_by_id_and_user(order_id, current_user)
    
    if order.stripe_payment_intent_id:
        # Return existing payment intent
        payment_intent = await stripe_client.retrieve_payment_intent(order.stripe_payment_intent_id)
    else:
        # Create new payment intent
        payment_intent = await stripe_client.create_payment_intent(
            amount=order.total_amount_cents,
            currency="usd",
            metadata={"order_id": str(order.id)}
        )
        order.stripe_payment_intent_id = payment_intent.id
        await save_order(order)
    
    return StripePaymentIntent(
        client_secret=payment_intent.client_secret,
        payment_intent_id=payment_intent.id,
        amount=payment_intent.amount,
        currency=payment_intent.currency,
        status=payment_intent.status
    )


@router.get("/stripe/connect-account", response_model=StripeConnectAccount)
async def get_connect_account(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get practitioner's Stripe Connect account status"""
    if not practitioner.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Stripe account found"
        )
    
    account = await stripe_client.retrieve_account(practitioner.stripe_account_id)
    
    return StripeConnectAccount(
        account_id=account.id,
        charges_enabled=account.charges_enabled,
        payouts_enabled=account.payouts_enabled,
        details_submitted=account.details_submitted,
        verification_status=account.requirements.currently_due
    )


@router.post("/stripe/connect-onboarding", response_model=StripeAccountLink)
async def create_connect_onboarding_link(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Create Stripe Connect onboarding link"""
    if not practitioner.stripe_account_id:
        # Create new account
        account = await stripe_client.create_account(
            type="express",
            email=practitioner.user.email,
            metadata={"practitioner_id": str(practitioner.id)}
        )
        practitioner.stripe_account_id = account.id
        await save_practitioner(practitioner)
    
    # Create account link
    account_link = await stripe_client.create_account_link(
        account=practitioner.stripe_account_id,
        refresh_url=f"{settings.FRONTEND_URL}/dashboard/payments/setup",
        return_url=f"{settings.FRONTEND_URL}/dashboard/payments/success"
    )
    
    return StripeAccountLink(
        url=account_link.url,
        expires_at=timezone.datetime.fromtimestamp(account_link.expires_at)
    )


# =============================================================================
# REFUNDS
# =============================================================================

@router.post("/refunds", response_model=RefundResponse)
async def create_refund(
    refund_data: RefundRequest,
    current_user: User = Depends(get_current_superuser)
):
    """Create a refund (staff only)"""
    order = await get_order_by_id(refund_data.order_id)
    
    refund_amount = refund_data.amount or order.total_amount
    
    if refund_data.refund_to_credits:
        # Refund as credits
        await create_refund_transaction_with_order_update(order, refund_amount)
        
        return RefundResponse(
            refund_id=str(order.id),
            order_id=order.id,
            amount=refund_amount,
            status="completed",
            refund_type="credits",
            created_at=timezone.now()
        )
    else:
        # Stripe refund
        if not order.stripe_payment_intent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot refund non-Stripe payment to payment method"
            )
        
        stripe_refund = await stripe_client.create_refund(
            payment_intent=order.stripe_payment_intent_id,
            amount=int(refund_amount * 100),
            reason=refund_data.reason
        )
        
        return RefundResponse(
            refund_id=stripe_refund.id,
            order_id=order.id,
            amount=refund_amount,
            status=stripe_refund.status,
            refund_type="payment_method",
            created_at=timezone.datetime.fromtimestamp(stripe_refund.created)
        )


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get("/admin/orders", response_model=OrderListResponse)
async def admin_list_orders(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_superuser),
    user_id: Optional[UUID] = None,
    status: Optional[str] = None
):
    """List all orders (staff only)"""
    @sync_to_async
    def get_admin_orders_queryset():
        queryset = Order.objects.all().order_by('-created_at')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if status:
            queryset = queryset.filter(status=status)
        return queryset
    
    queryset = await get_admin_orders_queryset()
    return await paginate_queryset(queryset, pagination, OrderResponse)


@router.post("/admin/payouts/batch")
async def process_batch_payouts(
    current_user: User = Depends(get_current_superuser)
):
    """Process batch payouts (staff only)"""
    count = await get_batch_payout_count()
    return {"message": f"Created batch payout for {count} practitioners"}