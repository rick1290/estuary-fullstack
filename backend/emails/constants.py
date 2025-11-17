"""
Email Template Constants
Maps email types to their MJML template files.
"""

# Client Email Templates
CLIENT_EMAILS = {
    'WELCOME': 'clients/welcome.mjml',
    'EMAIL_VERIFICATION': 'clients/email_verification.mjml',
    'BOOKING_CONFIRMATION': 'clients/booking_confirmation.mjml',
    'PAYMENT_SUCCESS': 'clients/payment_success.mjml',
    'SESSION_CONFIRMATION': 'clients/session_confirmation.mjml',
    'REMINDER': 'clients/reminder.mjml',  # Used for both 24h and 30m
    'BOOKING_CANCELLED': 'shared/booking_cancelled.mjml',  # Shared template
    'BOOKING_RESCHEDULED': 'shared/booking_rescheduled.mjml',  # Shared template
    'CREDIT_PURCHASE': 'clients/credit_purchase.mjml',
    'REVIEW_REQUEST': 'clients/review_request.mjml',
    'MESSAGE_NOTIFICATION': 'shared/message_notification.mjml',  # Shared template
    'BOOKING_COMPLETED_REVIEW_REQUEST': 'clients/booking_completed_review.mjml',
}

# Practitioner Email Templates
PRACTITIONER_EMAILS = {
    'WELCOME': 'practitioners/welcome.mjml',
    'ONBOARDING_COMPLETED': 'practitioners/onboarding_completed.mjml',
    'PROFILE_INCOMPLETE': 'practitioners/profile_incomplete.mjml',
    'NO_SERVICES': 'practitioners/no_services.mjml',
    'SERVICE_CREATED': 'practitioners/service_created.mjml',
    'BUNDLE_CREATED': 'practitioners/bundle_created.mjml',
    'BOOKING_RECEIVED': 'practitioners/booking_received.mjml',
    'BOOKING_CANCELLED': 'shared/booking_cancelled.mjml',  # Shared template
    'BOOKING_RESCHEDULED': 'shared/booking_rescheduled.mjml',  # Shared template
    'PAYOUT_COMPLETED': 'practitioners/payout_completed.mjml',
    'REMINDER': 'practitioners/reminder.mjml',  # Used for both 24h and 30m
    'NEW_REVIEW': 'practitioners/new_review.mjml',
    'EARNINGS_SUMMARY': 'practitioners/earnings_summary.mjml',
    'MESSAGE_NOTIFICATION': 'shared/message_notification.mjml',  # Shared template
    'VERIFICATION_APPROVED': 'practitioners/verification_approved.mjml',
    'VERIFICATION_REJECTED': 'practitioners/verification_rejected.mjml',
}

# Brand Colors (matching frontend)
BRAND_COLORS = {
    'sage': '#7a8b63',          # Primary green
    'sage_light': '#95a57f',    # sage-400
    'sage_dark': '#61704d',     # sage-600
    'terracotta': '#cc8156',    # Secondary orange
    'olive': '#3c412a',         # Text color (olive-900)
    'olive_medium': '#6f7a47',  # olive-600
    'cream': '#fdfcf8',         # Background (cream-50)
    'cream_dark': '#f5f1e6',    # cream-200
    'white': '#ffffff',
    'border': '#e2d5bd',        # cream-400
}

# Email Settings
DEFAULT_FROM_EMAIL = 'Estuary <hello@updates.getestuary.com>'
SUPPORT_EMAIL = 'support@estuary.com'
LOGO_URL = 'https://your-cdn.com/logo.png'  # TODO: Upload to Cloudflare R2
WEBSITE_URL = 'https://estuary.com'

# Frontend URL Paths
# Use these constants to build URLs in email templates
# Example: f"{WEBSITE_URL}{URL_PATHS['USER_DASHBOARD']}"

URL_PATHS = {
    # Public Pages
    'HOME': '/',
    'ABOUT': '/about',
    'HELP': '/help',
    'CONTACT': '/contact',
    'PRIVACY': '/privacy',
    'TERMS': '/terms',
    'CAREERS': '/careers',
    'MISSION': '/mission',
    'BLOG': '/blog',

    # Marketplace
    'MARKETPLACE': '/marketplace',
    'MARKETPLACE_SESSIONS': '/marketplace/sessions',
    'MARKETPLACE_WORKSHOPS': '/marketplace/workshops',
    'MARKETPLACE_COURSES': '/marketplace/courses',
    'MARKETPLACE_BUNDLES': '/marketplace/bundles',
    'MARKETPLACE_PACKAGES': '/marketplace/packages',
    'MARKETPLACE_PRACTITIONERS': '/marketplace/practitioners',

    # Service & Practitioner Detail Pages (use .format() with id)
    'SERVICE_DETAIL': '/services/{id}',  # Use: URL_PATHS['SERVICE_DETAIL'].format(id=service_id)
    'SESSION_DETAIL': '/sessions/{id}',
    'WORKSHOP_DETAIL': '/workshops/{id}',
    'COURSE_DETAIL': '/courses/{id}',
    'PRACTITIONER_PROFILE': '/practitioners/{id}',
    'BUNDLE_DETAIL': '/bundles/{id}',
    'PACKAGE_DETAIL': '/packages/{id}',

    # User Dashboard
    'USER_DASHBOARD': '/dashboard/user',
    'USER_BOOKINGS': '/dashboard/user/bookings',
    'USER_BOOKING_DETAIL': '/dashboard/user/bookings/{id}',
    'USER_BOOKING_RESCHEDULE': '/dashboard/user/bookings/{id}/reschedule',
    'USER_PROFILE': '/dashboard/user/profile',
    'USER_MESSAGES': '/dashboard/user/messages',
    'USER_FAVORITES': '/dashboard/user/favorites',
    'USER_STREAMS': '/dashboard/user/streams',
    'USER_SUBSCRIPTIONS': '/dashboard/user/subscriptions',
    'USER_REFERRAL': '/dashboard/user/referral',

    # Practitioner Dashboard
    'PRACTITIONER_DASHBOARD': '/dashboard/practitioner',
    'PRACTITIONER_BOOKINGS': '/dashboard/practitioner/bookings',
    'PRACTITIONER_BOOKING_DETAIL': '/dashboard/practitioner/bookings/{id}',
    'PRACTITIONER_CALENDAR': '/dashboard/practitioner/calendar',
    'PRACTITIONER_MESSAGES': '/dashboard/practitioner/messages',
    'PRACTITIONER_PROFILE': '/dashboard/practitioner/profile',
    'PRACTITIONER_SETTINGS': '/dashboard/practitioner/settings',
    'PRACTITIONER_AVAILABILITY': '/dashboard/practitioner/availability',
    'PRACTITIONER_ANALYTICS': '/dashboard/practitioner/analytics',
    'PRACTITIONER_CLIENTS': '/dashboard/practitioner/clients',
    'PRACTITIONER_CLIENT_DETAIL': '/dashboard/practitioner/clients/{id}',
    'PRACTITIONER_REFERRALS': '/dashboard/practitioner/referrals',
    'PRACTITIONER_STREAMS': '/dashboard/practitioner/streams',

    # Practitioner Services
    'PRACTITIONER_SERVICES': '/dashboard/practitioner/services',
    'PRACTITIONER_SERVICE_NEW': '/dashboard/practitioner/services/new',
    'PRACTITIONER_SERVICE_CREATE': '/dashboard/practitioner/services/create',
    'PRACTITIONER_SERVICE_EDIT': '/dashboard/practitioner/services/edit/{id}',

    # Practitioner Finances
    'PRACTITIONER_FINANCES': '/dashboard/practitioner/finances',
    'PRACTITIONER_FINANCES_OVERVIEW': '/dashboard/practitioner/finances/overview',
    'PRACTITIONER_FINANCES_EARNINGS': '/dashboard/practitioner/finances/earnings',
    'PRACTITIONER_FINANCES_PAYOUTS': '/dashboard/practitioner/finances/payouts',
    'PRACTITIONER_FINANCES_TRANSACTIONS': '/dashboard/practitioner/finances/transactions',

    # Video Room / Sessions
    'ROOM_LOBBY': '/room/{room_id}/lobby',  # Use with room UUID
    'ROOM_BOOKING_LOBBY': '/room/booking/{booking_id}/lobby',
    'ROOM_SESSION_LOBBY': '/room/session/{session_id}/lobby',

    # Authentication & Onboarding
    'AUTH_LOGIN': '/auth/login',
    'AUTH_SIGNUP': '/auth/signup',
    'BECOME_PRACTITIONER': '/become-practitioner',
    'WAITLIST': '/waitlist',

    # Checkout
    'CHECKOUT': '/checkout',

    # Streams (Content)
    'STREAMS': '/streams',
    'STREAM_DETAIL': '/streams/{id}',
}

# Helper function to build complete URLs
def build_url(path_key: str, **kwargs) -> str:
    """
    Build a complete URL from a path key and optional parameters.

    Args:
        path_key: Key from URL_PATHS dictionary
        **kwargs: Parameters to format into the path (e.g., id=123)

    Returns:
        Complete URL string

    Examples:
        >>> build_url('USER_DASHBOARD')
        'https://estuary.com/dashboard/user'

        >>> build_url('SERVICE_DETAIL', id=123)
        'https://estuary.com/services/123'

        >>> build_url('PRACTITIONER_BOOKING_DETAIL', id='abc-123')
        'https://estuary.com/dashboard/practitioner/bookings/abc-123'
    """
    from django.conf import settings
    website_url = getattr(settings, 'FRONTEND_URL', WEBSITE_URL)
    path = URL_PATHS.get(path_key, '/')

    if kwargs:
        path = path.format(**kwargs)

    return f"{website_url.rstrip('/')}{path}"

# Email subjects
EMAIL_SUBJECTS = {
    # Client subjects
    'CLIENT_WELCOME': 'Welcome to Estuary! <?',
    'CLIENT_EMAIL_VERIFICATION': 'Verify your email address',
    'CLIENT_BOOKING_CONFIRMATION': 'Booking Confirmed - {service_name}',
    'CLIENT_PAYMENT_SUCCESS': 'Payment Successful',
    'CLIENT_SESSION_CONFIRMATION': 'Session Confirmed with {practitioner_name}',
    'CLIENT_REMINDER_24H': 'Reminder: Your session is tomorrow',
    'CLIENT_REMINDER_30M': 'Reminder: Your session starts in 30 minutes',
    'CLIENT_BOOKING_CANCELLED': 'Booking Cancelled - {service_name}',
    'CLIENT_BOOKING_RESCHEDULED': 'Booking Rescheduled - {service_name}',
    'CLIENT_CREDIT_PURCHASE': 'Credits Added to Your Account',
    'CLIENT_REVIEW_REQUEST': 'How was your session with {practitioner_name}?',
    'CLIENT_MESSAGE': 'New message from {sender_name}',
    'CLIENT_BOOKING_COMPLETED_REVIEW': 'Share your experience',

    # Practitioner subjects
    'PRACTITIONER_WELCOME': 'Welcome to Estuary - Let\'s get started! <?',
    'PRACTITIONER_ONBOARDING_COMPLETED': 'Onboarding Complete - What\'s Next?',
    'PRACTITIONER_PROFILE_INCOMPLETE': 'Complete your practitioner profile',
    'PRACTITIONER_NO_SERVICES': 'Ready to create your first service?',
    'PRACTITIONER_SERVICE_CREATED': 'Service Created: {service_name}',
    'PRACTITIONER_BUNDLE_CREATED': 'Bundle Created: {bundle_name}',
    'PRACTITIONER_BOOKING_RECEIVED': 'New Booking: {client_name} - {service_name}',
    'PRACTITIONER_BOOKING_CANCELLED': 'Booking Cancelled - {service_name}',
    'PRACTITIONER_BOOKING_RESCHEDULED': 'Booking Rescheduled - {service_name}',
    'PRACTITIONER_PAYOUT_COMPLETED': 'Payout Completed - ${amount}',
    'PRACTITIONER_REMINDER_24H': 'Reminder: Session tomorrow with {client_name}',
    'PRACTITIONER_REMINDER_30M': 'Reminder: Session in 30 minutes',
    'PRACTITIONER_NEW_REVIEW': 'New {stars}-star review from {client_name}',
    'PRACTITIONER_EARNINGS_SUMMARY': 'Your Weekly Earnings Summary',
    'PRACTITIONER_MESSAGE': 'New message from {sender_name}',
    'PRACTITIONER_VERIFICATION_APPROVED': 'Your practitioner profile has been approved!',
    'PRACTITIONER_VERIFICATION_REJECTED': 'Update needed for your practitioner profile',
}
