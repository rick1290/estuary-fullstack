"""
Utility functions for sending email notifications using Courier.
"""
import logging
import uuid
from typing import Dict, List, Optional, Union

from django.conf import settings
from django.urls import reverse
from django.utils import timezone

from .client import courier_client

logger = logging.getLogger(__name__)


def send_booking_confirmation(booking, user=None):
    """
    Send a booking confirmation email.
    
    Args:
        booking: Booking model instance
        user: Optional user model instance (defaults to booking.user)
    
    Returns:
        Response from Courier API
    """
    user = user or booking.user
    if not user or not user.email:
        logger.warning(f"Cannot send booking confirmation: No email for booking {booking.id}")
        return {"error": "No email address available"}
    
    # Get service and practitioner details
    service = booking.service
    practitioner = service.practitioner if service else None
    
    # Format date and time
    start_time = booking.start_datetime.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Get service session details if applicable
    service_session = booking.service_session
    session_details = ""
    if service_session:
        session_details = f"Session: {service_session.name}\n"
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "service_name": service.name if service else "Service",
        "practitioner_name": practitioner.user.get_full_name() if practitioner and practitioner.user else "Practitioner",
        "booking_time": start_time,
        "booking_id": str(booking.id),
        "session_details": session_details,
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_BOOKING_CONFIRMATION_TEMPLATE', None)
    
    if not template_id:
        subject = f"Booking Confirmation: {service.name if service else 'Service'}"
        body = f"""
        Hello {data['user_name']},
        
        Your booking has been confirmed!
        
        Details:
        Service: {data['service_name']}
        Practitioner: {data['practitioner_name']}
        Date and Time: {data['booking_time']}
        {session_details}
        
        Thank you for using our platform.
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"booking-confirmation-{booking.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )


def send_booking_reminder(booking, user=None, hours_before=24):
    """
    Send a booking reminder email.
    
    Args:
        booking: Booking model instance
        user: Optional user model instance (defaults to booking.user)
        hours_before: Hours before the booking to send the reminder
    
    Returns:
        Response from Courier API
    """
    user = user or booking.user
    if not user or not user.email:
        logger.warning(f"Cannot send booking reminder: No email for booking {booking.id}")
        return {"error": "No email address available"}
    
    # Get service and practitioner details
    service = booking.service
    practitioner = service.practitioner if service else None
    
    # Format date and time
    start_time = booking.start_datetime.strftime("%A, %B %d, %Y at %I:%M %p")
    
    # Get service session details if applicable
    service_session = booking.service_session
    session_details = ""
    if service_session:
        session_details = f"Session: {service_session.name}\n"
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "service_name": service.name if service else "Service",
        "practitioner_name": practitioner.user.get_full_name() if practitioner and practitioner.user else "Practitioner",
        "booking_time": start_time,
        "booking_id": str(booking.id),
        "session_details": session_details,
        "hours_before": hours_before
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_BOOKING_REMINDER_TEMPLATE', None)
    
    if not template_id:
        subject = f"Reminder: Your booking in {hours_before} hours"
        body = f"""
        Hello {data['user_name']},
        
        This is a reminder that you have a booking in {hours_before} hours.
        
        Details:
        Service: {data['service_name']}
        Practitioner: {data['practitioner_name']}
        Date and Time: {data['booking_time']}
        {session_details}
        
        We look forward to seeing you!
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"booking-reminder-{booking.id}-{hours_before}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )


def send_payment_receipt(order, user=None):
    """
    Send a payment receipt email.
    
    Args:
        order: Order model instance
        user: Optional user model instance (defaults to order.user)
    
    Returns:
        Response from Courier API
    """
    user = user or order.user
    if not user or not user.email:
        logger.warning(f"Cannot send payment receipt: No email for order {order.id}")
        return {"error": "No email address available"}
    
    # Get service details if applicable
    service = order.service
    service_details = ""
    if service:
        service_details = f"Service: {service.name}\n"
    
    # Format amount
    amount_formatted = f"${order.amount:.2f}"
    
    # Get receipt URL from Stripe if available
    receipt_url = None
    if order.metadata and 'payment_intent_details' in order.metadata:
        receipt_url = order.metadata['payment_intent_details'].get('receipt_url')
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "order_id": str(order.id),
        "amount": amount_formatted,
        "service_details": service_details,
        "order_date": order.created_at.strftime("%B %d, %Y"),
        "receipt_url": receipt_url
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_PAYMENT_RECEIPT_TEMPLATE', None)
    
    if not template_id:
        subject = f"Receipt for your payment of {amount_formatted}"
        body = f"""
        Hello {data['user_name']},
        
        Thank you for your payment of {data['amount']}.
        
        Details:
        Order ID: {data['order_id']}
        Date: {data['order_date']}
        {service_details}
        
        {"View your receipt: " + receipt_url if receipt_url else ""}
        
        Thank you for your business!
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"payment-receipt-{order.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )


def send_credit_purchase_confirmation(credit_transaction, user=None):
    """
    Send a credit purchase confirmation email.
    
    Args:
        credit_transaction: CreditTransaction model instance
        user: Optional user model instance (defaults to credit_transaction.user)
    
    Returns:
        Response from Courier API
    """
    user = user or credit_transaction.user
    if not user or not user.email:
        logger.warning(f"Cannot send credit purchase confirmation: No email for transaction {credit_transaction.id}")
        return {"error": "No email address available"}
    
    # Format amount
    amount_formatted = f"${float(credit_transaction.amount):.2f}"
    
    # Get current credit balance
    from apps.payments.models import CreditTransaction
    current_balance = CreditTransaction.get_balance(user)
    balance_formatted = f"${float(current_balance):.2f}"
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "transaction_id": str(credit_transaction.id),
        "amount": amount_formatted,
        "current_balance": balance_formatted,
        "transaction_date": credit_transaction.created_at.strftime("%B %d, %Y")
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_CREDIT_PURCHASE_TEMPLATE', None)
    
    if not template_id:
        subject = f"Credit Purchase Confirmation: {amount_formatted}"
        body = f"""
        Hello {data['user_name']},
        
        Your credit purchase of {data['amount']} has been confirmed!
        
        Details:
        Transaction ID: {data['transaction_id']}
        Date: {data['transaction_date']}
        Current Balance: {data['current_balance']}
        
        Thank you for your purchase!
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"credit-purchase-{credit_transaction.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )


def send_welcome_email(user):
    """
    Send a welcome email to a new user.
    
    Args:
        user: User model instance
    
    Returns:
        Response from Courier API
    """
    if not user or not user.email:
        logger.warning("Cannot send welcome email: No email provided")
        return {"error": "No email address available"}
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "login_url": settings.FRONTEND_URL + "/login"
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_WELCOME_TEMPLATE', None)
    
    if not template_id:
        subject = "Welcome to Estuary!"
        body = f"""
        Hello {data['user_name']},
        
        Welcome to Estuary! We're excited to have you join our community.
        
        You can log in to your account here: {data['login_url']}
        
        If you have any questions, please don't hesitate to contact us.
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"welcome-{user.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )


def send_password_reset_email(user, reset_token):
    """
    Send a password reset email.
    
    Args:
        user: User model instance
        reset_token: Password reset token
    
    Returns:
        Response from Courier API
    """
    if not user or not user.email:
        logger.warning("Cannot send password reset email: No email provided")
        return {"error": "No email address available"}
    
    # Generate reset URL
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Prepare data for template variables
    data = {
        "user_name": user.get_full_name() or user.email,
        "reset_url": reset_url,
        "expiry_hours": 24  # Assuming token expires in 24 hours
    }
    
    # Use template if configured, otherwise use default content
    template_id = getattr(settings, 'COURIER_PASSWORD_RESET_TEMPLATE', None)
    
    if not template_id:
        subject = "Reset Your Password"
        body = f"""
        Hello {data['user_name']},
        
        We received a request to reset your password. If you didn't make this request, you can ignore this email.
        
        To reset your password, click the link below:
        {data['reset_url']}
        
        This link will expire in {data['expiry_hours']} hours.
        
        The Estuary Team
        """
    
    # Generate idempotency key
    idempotency_key = f"password-reset-{user.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
    
    # Send the email
    return courier_client.send_email(
        email=user.email,
        subject=subject if not template_id else None,
        body=body if not template_id else None,
        data=data,
        template_id=template_id,
        idempotency_key=idempotency_key
    )
