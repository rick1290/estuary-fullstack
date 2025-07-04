"""
Notification configuration and template mappings.
"""
from django.conf import settings


# Courier Template IDs - Map these to your actual Courier template IDs
NOTIFICATION_TEMPLATES = {
    # Client Templates
    'CLIENT_WELCOME_TEMPLATE': getattr(settings, 'COURIER_CLIENT_WELCOME_TEMPLATE', 'CLIENT_WELCOME_V1'),
    'CLIENT_EMAIL_VERIFICATION_TEMPLATE': getattr(settings, 'COURIER_CLIENT_EMAIL_VERIFICATION_TEMPLATE', 'CLIENT_EMAIL_VERIFICATION_V1'),
    'CLIENT_BOOKING_CONFIRMATION_TEMPLATE': getattr(settings, 'COURIER_CLIENT_BOOKING_CONFIRMATION_TEMPLATE', 'CLIENT_BOOKING_CONFIRMATION_V1'),
    'CLIENT_PAYMENT_SUCCESS_TEMPLATE': getattr(settings, 'COURIER_CLIENT_PAYMENT_SUCCESS_TEMPLATE', 'CLIENT_PAYMENT_SUCCESS_V1'),
    'CLIENT_SESSION_CONFIRMATION_TEMPLATE': getattr(settings, 'COURIER_CLIENT_SESSION_CONFIRMATION_TEMPLATE', 'CLIENT_SESSION_CONFIRMATION_V1'),
    'CLIENT_REMINDER_24H_TEMPLATE': getattr(settings, 'COURIER_CLIENT_REMINDER_24H_TEMPLATE', 'CLIENT_REMINDER_24H_V1'),
    'CLIENT_REMINDER_30M_TEMPLATE': getattr(settings, 'COURIER_CLIENT_REMINDER_30M_TEMPLATE', 'CLIENT_REMINDER_30M_V1'),
    'CLIENT_BOOKING_CANCELLED_TEMPLATE': getattr(settings, 'COURIER_CLIENT_BOOKING_CANCELLED_TEMPLATE', 'CLIENT_BOOKING_CANCELLED_V1'),
    'CLIENT_BOOKING_RESCHEDULED_TEMPLATE': getattr(settings, 'COURIER_CLIENT_BOOKING_RESCHEDULED_TEMPLATE', 'CLIENT_BOOKING_RESCHEDULED_V1'),
    'CLIENT_CREDIT_PURCHASE_TEMPLATE': getattr(settings, 'COURIER_CLIENT_CREDIT_PURCHASE_TEMPLATE', 'CLIENT_CREDIT_PURCHASE_V1'),
    'CLIENT_REVIEW_REQUEST_TEMPLATE': getattr(settings, 'COURIER_CLIENT_REVIEW_REQUEST_TEMPLATE', 'CLIENT_REVIEW_REQUEST_V1'),
    'CLIENT_PRACTITIONER_MESSAGE_TEMPLATE': getattr(settings, 'COURIER_CLIENT_PRACTITIONER_MESSAGE_TEMPLATE', 'CLIENT_PRACTITIONER_MESSAGE_V1'),
    
    # Practitioner Templates
    'PRACTITIONER_WELCOME_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_WELCOME_TEMPLATE', 'PRACTITIONER_WELCOME_V1'),
    'PRACTITIONER_PROFILE_INCOMPLETE_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_PROFILE_INCOMPLETE_TEMPLATE', 'PRACTITIONER_PROFILE_INCOMPLETE_V1'),
    'PRACTITIONER_NO_SERVICES_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_NO_SERVICES_TEMPLATE', 'PRACTITIONER_NO_SERVICES_V1'),
    'PRACTITIONER_SERVICE_CREATED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_SERVICE_CREATED_TEMPLATE', 'PRACTITIONER_SERVICE_CREATED_V1'),
    'PRACTITIONER_BUNDLE_CREATED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_BUNDLE_CREATED_TEMPLATE', 'PRACTITIONER_BUNDLE_CREATED_V1'),
    'PRACTITIONER_BOOKING_RECEIVED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_BOOKING_RECEIVED_TEMPLATE', 'PRACTITIONER_BOOKING_RECEIVED_V1'),
    'PRACTITIONER_BOOKING_CANCELLED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_BOOKING_CANCELLED_TEMPLATE', 'PRACTITIONER_BOOKING_CANCELLED_V1'),
    'PRACTITIONER_BOOKING_RESCHEDULED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_BOOKING_RESCHEDULED_TEMPLATE', 'PRACTITIONER_BOOKING_RESCHEDULED_V1'),
    'PRACTITIONER_PAYOUT_COMPLETED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_PAYOUT_COMPLETED_TEMPLATE', 'PRACTITIONER_PAYOUT_COMPLETED_V1'),
    'PRACTITIONER_REMINDER_24H_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_REMINDER_24H_TEMPLATE', 'PRACTITIONER_REMINDER_24H_V1'),
    'PRACTITIONER_REMINDER_30M_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_REMINDER_30M_TEMPLATE', 'PRACTITIONER_REMINDER_30M_V1'),
    'PRACTITIONER_NEW_REVIEW_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_NEW_REVIEW_TEMPLATE', 'PRACTITIONER_NEW_REVIEW_V1'),
    'PRACTITIONER_EARNINGS_SUMMARY_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_EARNINGS_SUMMARY_TEMPLATE', 'PRACTITIONER_EARNINGS_SUMMARY_V1'),
    'PRACTITIONER_CLIENT_MESSAGE_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_CLIENT_MESSAGE_TEMPLATE', 'PRACTITIONER_CLIENT_MESSAGE_V1'),
    'PRACTITIONER_VERIFICATION_APPROVED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_VERIFICATION_APPROVED_TEMPLATE', 'PRACTITIONER_VERIFICATION_APPROVED_V1'),
    'PRACTITIONER_VERIFICATION_REJECTED_TEMPLATE': getattr(settings, 'COURIER_PRACTITIONER_VERIFICATION_REJECTED_TEMPLATE', 'PRACTITIONER_VERIFICATION_REJECTED_V1'),
}


# Notification preferences defaults
DEFAULT_NOTIFICATION_PREFERENCES = {
    'booking': {
        'email': True,
        'sms': False,
        'in_app': True,
        'push': True
    },
    'payment': {
        'email': True,
        'sms': False,
        'in_app': True,
        'push': True
    },
    'session': {
        'email': True,
        'sms': True,
        'in_app': True,
        'push': True
    },
    'review': {
        'email': True,
        'sms': False,
        'in_app': True,
        'push': True
    },
    'system': {
        'email': True,
        'sms': False,
        'in_app': True,
        'push': False
    },
    'message': {
        'email': True,
        'sms': False,
        'in_app': True,
        'push': True
    },
    'reminder': {
        'email': True,
        'sms': True,
        'in_app': True,
        'push': True
    }
}


# Celery Beat Schedule for periodic notifications
CELERY_BEAT_SCHEDULE = {
    'process-scheduled-notifications': {
        'task': 'notifications.tasks.process_scheduled_notifications',
        'schedule': 60.0,  # Every minute
    },
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': 86400.0,  # Daily
    },
    'send-practitioner-earnings-summaries': {
        'task': 'notifications.tasks.send_practitioner_earnings_summaries',
        'schedule': 604800.0,  # Weekly (Monday morning)
        'options': {
            'hour': 9,
            'minute': 0,
            'day_of_week': 1,  # Monday
        }
    },
}


# Email sending configuration
EMAIL_CONFIG = {
    'BATCH_SIZE': 100,  # Number of emails to send in one batch
    'RATE_LIMIT': 50,   # Max emails per second
    'RETRY_ATTEMPTS': 3,
    'RETRY_DELAY': 60,  # Seconds between retries
}


# Template variable validation schemas
TEMPLATE_SCHEMAS = {
    'CLIENT_BOOKING_CONFIRMATION': {
        'required': [
            'user_name', 'service_name', 'practitioner_name', 
            'booking_date', 'booking_time', 'booking_id'
        ],
        'optional': [
            'session_name', 'session_number', 'location', 
            'total_amount', 'credits_used', 'add_to_calendar_url'
        ]
    },
    'PRACTITIONER_BOOKING_RECEIVED': {
        'required': [
            'client_name', 'service_name', 'booking_date',
            'booking_time', 'net_earnings', 'booking_id'
        ],
        'optional': [
            'client_notes', 'session_details', 'location'
        ]
    },
    # Add more schemas as needed
}