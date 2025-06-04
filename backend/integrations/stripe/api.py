from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .utils import create_payment_for_service, create_payment_for_credits
from apps.services.models import Service

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment(request):
    """
    Create a payment for a service or credit purchase.
    
    This endpoint handles both service purchases and credit purchases,
    and supports both Payment Intents and Checkout Sessions.
    
    Request body for service purchase:
        service_id: ID of the service to create a payment for
        payment_type: 'intent' for Payment Intent, 'checkout' for Checkout Session
        amount: Amount to charge (optional, will use service price if not provided)
        service_data: Additional service data (optional)
        scheduling_data: Scheduling information (optional)
        success_url: (Optional) URL to redirect after successful payment (for checkout)
        cancel_url: (Optional) URL to redirect after cancelled payment (for checkout)
    
    Request body for credit purchase:
        is_credit_purchase: Set to true for credit purchase
        amount: Amount to charge
        credit_amount: Amount of credits to purchase (optional, defaults to amount)
        payment_type: 'intent' for Payment Intent, 'checkout' for Checkout Session
        success_url: (Optional) URL to redirect after successful payment (for checkout)
        cancel_url: (Optional) URL to redirect after cancelled payment (for checkout)
    
    Returns:
        Payment data including client_secret or checkout URL
    """
    # Check if this is a credit purchase
    is_credit_purchase = request.data.get('is_credit_purchase', False)
    
    payment_type = request.data.get('payment_type', 'intent')
    if payment_type not in ['intent', 'checkout']:
        return Response(
            {'error': 'payment_type must be either "intent" or "checkout"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    success_url = request.data.get('success_url')
    cancel_url = request.data.get('cancel_url')
    
    try:
        if is_credit_purchase:
            # Handle credit purchase
            amount = request.data.get('amount')
            if not amount:
                return Response(
                    {'error': 'amount is required for credit purchase'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            credit_amount = request.data.get('credit_amount', amount)
            
            # Create payment for credits
            payment_data = create_payment_for_credits(
                request.user,
                float(amount),
                float(credit_amount),
                payment_type,
                success_url,
                cancel_url
            )
            
            return Response(payment_data)
        else:
            # Handle service purchase
            service_id = request.data.get('service_id')
            if not service_id:
                return Response(
                    {'error': 'service_id is required for service purchase'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the service
            try:
                service = Service.objects.get(id=service_id)
            except Service.DoesNotExist:
                return Response(
                    {'error': 'Service not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get amount (use service price if not provided)
            amount = request.data.get('amount')
            if not amount:
                if hasattr(service, 'price'):
                    amount = service.price
                else:
                    return Response(
                        {'error': 'amount is required when service has no price'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Get additional data
            service_data = request.data.get('service_data', {})
            scheduling_data = request.data.get('scheduling_data', {})
            
            # Create payment for service
            payment_data = create_payment_for_service(
                request.user,
                service,
                float(amount),
                payment_type,
                service_data,
                scheduling_data,
                success_url,
                cancel_url
            )
            
            return Response(payment_data)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_methods(request):
    """
    Get saved payment methods for the authenticated user.
    
    Returns:
        List of payment methods
    """
    try:
        # Import here to avoid circular imports
        from apps.payments.models import PaymentMethod
        
        # Get payment methods for the user
        payment_methods = PaymentMethod.objects.filter(user=request.user)
        
        # Format the response
        result = []
        for pm in payment_methods:
            result.append({
                'id': pm.id,
                'stripe_payment_method_id': pm.stripe_payment_method_id,
                'card_brand': pm.card_brand,
                'last4': pm.last4,
                'exp_month': pm.exp_month,
                'exp_year': pm.exp_year,
                'is_default': pm.is_default
            })
        
        return Response({
            'payment_methods': result
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_default_payment_method(request):
    """
    Set a payment method as the default for the authenticated user.
    
    Request body:
        payment_method_id: ID of the payment method to set as default
    
    Returns:
        Success message
    """
    try:
        # Import here to avoid circular imports
        from apps.payments.models import PaymentMethod
        
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {'error': 'payment_method_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the payment method
        try:
            payment_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Payment method not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Set all payment methods to not default
        PaymentMethod.objects.filter(user=request.user).update(is_default=False)
        
        # Set this one as default
        payment_method.is_default = True
        payment_method.save()
        
        return Response({
            'success': True,
            'message': 'Payment method set as default'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_payment_method(request, payment_method_id):
    """
    Delete a payment method for the authenticated user.
    
    Args:
        payment_method_id: ID of the payment method to delete
    
    Returns:
        Success message
    """
    try:
        # Import here to avoid circular imports
        from apps.payments.models import PaymentMethod
        
        # Get the payment method
        try:
            payment_method = PaymentMethod.objects.get(id=payment_method_id, user=request.user)
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Payment method not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if this is the default payment method
        was_default = payment_method.is_default
        
        # Delete the payment method
        payment_method.delete()
        
        # If this was the default, set a new default if any payment methods remain
        if was_default:
            remaining = PaymentMethod.objects.filter(user=request.user).first()
            if remaining:
                remaining.is_default = True
                remaining.save()
        
        return Response({
            'success': True,
            'message': 'Payment method deleted'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
