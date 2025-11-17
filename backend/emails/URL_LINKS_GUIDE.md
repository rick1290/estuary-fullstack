# Email URL Links Guide

This guide explains how to use URL constants in email templates and services to ensure all links are correct and organized.

## Overview

All frontend URL paths are centralized in `/backend/emails/constants.py` in the `URL_PATHS` dictionary. This ensures:
- **Consistency**: All emails use the same paths
- **Maintainability**: Update paths in one place
- **Type Safety**: Catch typos early
- **Documentation**: Clear reference for all available routes

## URL Path Constants

### Key User Routes

```python
URL_PATHS = {
    # User Dashboard
    'USER_DASHBOARD': '/dashboard/user',
    'USER_BOOKINGS': '/dashboard/user/bookings',
    'USER_BOOKING_DETAIL': '/dashboard/user/bookings/{id}',
    'USER_BOOKING_RESCHEDULE': '/dashboard/user/bookings/{id}/reschedule',
    'USER_PROFILE': '/dashboard/user/profile',
    'USER_MESSAGES': '/dashboard/user/messages',
    'USER_FAVORITES': '/dashboard/user/favorites',

    # ... more paths
}
```

### Key Practitioner Routes

```python
URL_PATHS = {
    # Practitioner Dashboard
    'PRACTITIONER_DASHBOARD': '/dashboard/practitioner',
    'PRACTITIONER_BOOKINGS': '/dashboard/practitioner/bookings',
    'PRACTITIONER_BOOKING_DETAIL': '/dashboard/practitioner/bookings/{id}',
    'PRACTITIONER_FINANCES': '/dashboard/practitioner/finances',
    'PRACTITIONER_FINANCES_PAYOUTS': '/dashboard/practitioner/finances/payouts',
    'PRACTITIONER_SERVICES': '/dashboard/practitioner/services',

    # ... more paths
}
```

### Public & Marketplace Routes

```python
URL_PATHS = {
    # Public Pages
    'HOME': '/',
    'MARKETPLACE': '/marketplace',
    'HELP': '/help',
    'ABOUT': '/about',
    'PRIVACY': '/privacy',

    # Marketplace Filters
    'MARKETPLACE_SESSIONS': '/marketplace/sessions',
    'MARKETPLACE_WORKSHOPS': '/marketplace/workshops',
    'MARKETPLACE_COURSES': '/marketplace/courses',

    # Detail Pages (requires ID)
    'SERVICE_DETAIL': '/services/{id}',
    'PRACTITIONER_PROFILE': '/practitioners/{id}',

    # ... more paths
}
```

### Video Room Routes

```python
URL_PATHS = {
    # Room Access
    'ROOM_LOBBY': '/room/{room_id}/lobby',
    'ROOM_BOOKING_LOBBY': '/room/booking/{booking_id}/lobby',
    'ROOM_SESSION_LOBBY': '/room/session/{session_id}/lobby',
}
```

## Using URLs in Python Services

### The `build_url()` Helper Function

Use the `build_url()` function to generate complete URLs in your email services:

```python
from emails.constants import build_url

# Simple path (no parameters)
dashboard_url = build_url('USER_DASHBOARD')
# Result: 'https://estuary.com/dashboard/user'

# Path with ID parameter
booking_url = build_url('USER_BOOKING_DETAIL', id=booking.id)
# Result: 'https://estuary.com/dashboard/user/bookings/123'

# Path with UUID
room_url = build_url('ROOM_BOOKING_LOBBY', booking_id='abc-def-123')
# Result: 'https://estuary.com/room/booking/abc-def-123/lobby'
```

### Example: Updating an Email Service

**Before:**
```python
def send_booking_confirmation(booking):
    return EmailService.send_template_email(
        to=booking.user.email,
        template_path=CLIENT_EMAILS['BOOKING_CONFIRMATION'],
        context={
            'user': booking.user,
            'booking': booking,
        },
        subject='Booking Confirmed',
    )
```

**After:**
```python
def send_booking_confirmation(booking):
    from emails.constants import build_url

    return EmailService.send_template_email(
        to=booking.user.email,
        template_path=CLIENT_EMAILS['BOOKING_CONFIRMATION'],
        context={
            'user': booking.user,
            'booking': booking,
            'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
            'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id),
            'dashboard_url': build_url('USER_DASHBOARD'),
        },
        subject='Booking Confirmed',
    )
```

## Using URLs in MJML Email Templates

### Method 1: Using Pre-Built URLs from Context

When the service passes URLs in the context, use them directly:

```html
<!-- In booking_confirmation.mjml -->
<mj-button href="{{ booking_url }}">
  View Booking Details
</mj-button>

<mj-button href="{{ join_url }}">
  Join Video Session
</mj-button>
```

### Method 2: Using WEBSITE_URL + URL_PATHS

For static links that don't require parameters:

```html
<!-- In welcome.mjml -->
<mj-button href="{{ WEBSITE_URL }}{{ URL_PATHS.MARKETPLACE }}">
  Explore Marketplace
</mj-button>

<mj-text>
  <a href="{{ WEBSITE_URL }}{{ URL_PATHS.HELP }}">Visit Help Center</a>
</mj-text>

<mj-text>
  <a href="{{ WEBSITE_URL }}{{ URL_PATHS.USER_DASHBOARD }}">Go to Dashboard</a>
</mj-text>
```

### Method 3: Building URLs in Templates (Advanced)

You can also use the `build_url` function directly in templates:

```html
<!-- For simple paths -->
<mj-button href="{{ build_url('MARKETPLACE') }}">
  Browse Services
</mj-button>

<!-- For paths with IDs (if ID is in context) -->
<mj-button href="{{ build_url('SERVICE_DETAIL', id=service.id) }}">
  View Service
</mj-button>
```

## Complete Email Template Example

Here's a complete example showing proper URL usage:

```html
<mjml>
  <mj-body>
    <!-- Header with logo -->
    <mj-section>
      <mj-text>
        <a href="{{ WEBSITE_URL }}{{ URL_PATHS.HOME }}">ESTUARY</a>
      </mj-text>
    </mj-section>

    <!-- Content -->
    <mj-section>
      <mj-text>
        Hi {{ user.first_name }}, your booking is confirmed!
      </mj-text>

      <!-- Primary CTA - uses pre-built URL from context -->
      <mj-button href="{{ booking_url }}">
        View Booking Details
      </mj-button>

      <!-- Conditional video room button -->
      {% if has_video_room %}
      <mj-button href="{{ join_url }}">
        Join Video Session
      </mj-button>
      {% endif %}
    </mj-section>

    <!-- Footer with links -->
    <mj-section>
      <mj-text>
        <a href="{{ WEBSITE_URL }}{{ URL_PATHS.HELP }}">Help</a> ·
        <a href="{{ WEBSITE_URL }}{{ URL_PATHS.PRIVACY }}">Privacy</a> ·
        <a href="{{ WEBSITE_URL }}{{ URL_PATHS.USER_DASHBOARD }}">Dashboard</a>
      </mj-text>
    </mj-section>
  </mj-body>
</mjml>
```

## Common Email Types & Their URLs

### Client Booking Confirmation
```python
context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
    'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id),
    'reschedule_url': build_url('USER_BOOKING_RESCHEDULE', id=booking.id),
    'practitioner_url': build_url('PRACTITIONER_PROFILE', id=practitioner.id),
}
```

### Practitioner Booking Received
```python
context = {
    'booking_url': build_url('PRACTITIONER_BOOKING_DETAIL', id=booking.id),
    'client_url': build_url('PRACTITIONER_CLIENT_DETAIL', id=client.id),
    'calendar_url': build_url('PRACTITIONER_CALENDAR'),
    'messages_url': build_url('PRACTITIONER_MESSAGES'),
}
```

### Practitioner Payout Notification
```python
context = {
    'payout_url': build_url('PRACTITIONER_FINANCES_PAYOUTS'),
    'earnings_url': build_url('PRACTITIONER_FINANCES_EARNINGS'),
    'transactions_url': build_url('PRACTITIONER_FINANCES_TRANSACTIONS'),
}
```

### Welcome Email (Client)
```python
context = {
    'marketplace_url': build_url('MARKETPLACE'),
    'sessions_url': build_url('MARKETPLACE_SESSIONS'),
    'workshops_url': build_url('MARKETPLACE_WORKSHOPS'),
    'profile_url': build_url('USER_PROFILE'),
}
```

### Welcome Email (Practitioner)
```python
context = {
    'dashboard_url': build_url('PRACTITIONER_DASHBOARD'),
    'services_url': build_url('PRACTITIONER_SERVICES'),
    'availability_url': build_url('PRACTITIONER_AVAILABILITY'),
    'profile_url': build_url('PRACTITIONER_PROFILE'),
}
```

## Best Practices

### 1. Always Use Constants
❌ **Bad:**
```python
context = {
    'booking_url': 'https://estuary.com/bookings/' + str(booking.id)
}
```

✅ **Good:**
```python
from emails.constants import build_url

context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id)
}
```

### 2. Build URLs in Services, Not Templates
❌ **Bad:**
```html
<!-- Template has hardcoded paths -->
<mj-button href="{{ WEBSITE_URL }}/dashboard/user/bookings/{{ booking.id }}">
  View Booking
</mj-button>
```

✅ **Good:**
```python
# Service builds complete URL
context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id)
}
```

```html
<!-- Template uses pre-built URL -->
<mj-button href="{{ booking_url }}">
  View Booking
</mj-button>
```

### 3. Use Descriptive Variable Names
✅ **Good:**
```python
context = {
    'booking_detail_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
    'join_room_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id),
    'reschedule_booking_url': build_url('USER_BOOKING_RESCHEDULE', id=booking.id),
}
```

### 4. Handle Optional URLs
```python
context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
    # Only include room URL if booking has a video room
    'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id) if hasattr(booking, 'room') else None,
    'has_video_room': hasattr(booking, 'room'),
}
```

```html
{% if has_video_room %}
<mj-button href="{{ join_url }}">
  Join Video Session
</mj-button>
{% endif %}
```

## Testing Your URLs

Before sending emails to users, test your URLs:

```python
from emails.constants import build_url, URL_PATHS

# Test simple paths
assert build_url('USER_DASHBOARD') == 'https://estuary.com/dashboard/user'

# Test paths with parameters
assert build_url('USER_BOOKING_DETAIL', id=123) == 'https://estuary.com/dashboard/user/bookings/123'

# Test all paths are defined
assert 'USER_DASHBOARD' in URL_PATHS
assert 'PRACTITIONER_BOOKINGS' in URL_PATHS
```

## Adding New URLs

When adding a new frontend route, add it to `constants.py`:

1. **Add to URL_PATHS dictionary:**
```python
URL_PATHS = {
    # ... existing paths
    'NEW_FEATURE': '/new-feature',
    'NEW_DETAIL_PAGE': '/new-feature/{id}',
}
```

2. **Use in email services:**
```python
context = {
    'new_feature_url': build_url('NEW_FEATURE'),
    'detail_url': build_url('NEW_DETAIL_PAGE', id=item.id),
}
```

3. **Update this documentation** with the new route and example usage.

## Troubleshooting

### URL is incorrect in email
1. Check that the path is defined in `URL_PATHS`
2. Verify you're using the correct key name
3. Ensure you're passing all required parameters (e.g., `id`)
4. Check that `FRONTEND_URL` is set correctly in Django settings

### Variable not available in template
1. Verify the URL is added to the `context` in the service method
2. Check that `render_email()` in `utils.py` includes default context
3. Ensure the template is using the correct variable name

### Path has wrong parameter name
Some paths use specific parameter names:
- Most use `id`: `/bookings/{id}`
- Rooms use specific names: `/room/{room_id}/lobby`, `/room/booking/{booking_id}/lobby`

Match the parameter name when calling `build_url()`:
```python
# Correct
build_url('ROOM_LOBBY', room_id='123')
build_url('ROOM_BOOKING_LOBBY', booking_id='456')

# Incorrect
build_url('ROOM_LOBBY', id='123')  # Wrong parameter name!
```

## Summary

- ✅ All URLs defined in `/backend/emails/constants.py`
- ✅ Use `build_url()` function in Python services
- ✅ Pass complete URLs in context to templates
- ✅ Use `{{ WEBSITE_URL }}{{ URL_PATHS.KEY }}` for static links in templates
- ✅ Keep URL building logic in services, not templates
- ✅ Test URLs before deploying

For questions or issues, refer to:
- `/backend/emails/constants.py` - All URL definitions
- `/backend/emails/services.py` - Example usage in services
- `/backend/emails/templates/` - Example usage in templates
