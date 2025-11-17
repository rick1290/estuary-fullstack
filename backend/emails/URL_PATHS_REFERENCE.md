# Email URL Paths - Quick Reference

Complete list of all available URL paths for emails, organized by category.

## Public Pages

| Constant | Path | Description |
|----------|------|-------------|
| `HOME` | `/` | Homepage |
| `ABOUT` | `/about` | About page |
| `HELP` | `/help` | Help center |
| `CONTACT` | `/contact` | Contact page |
| `PRIVACY` | `/privacy` | Privacy policy |
| `TERMS` | `/terms` | Terms of service |
| `CAREERS` | `/careers` | Careers page |
| `MISSION` | `/mission` | Mission statement |
| `BLOG` | `/blog` | Blog homepage |

## Marketplace

| Constant | Path | Description |
|----------|------|-------------|
| `MARKETPLACE` | `/marketplace` | Main marketplace hub |
| `MARKETPLACE_SESSIONS` | `/marketplace/sessions` | Filter by sessions |
| `MARKETPLACE_WORKSHOPS` | `/marketplace/workshops` | Filter by workshops |
| `MARKETPLACE_COURSES` | `/marketplace/courses` | Filter by courses |
| `MARKETPLACE_BUNDLES` | `/marketplace/bundles` | Filter by bundles |
| `MARKETPLACE_PACKAGES` | `/marketplace/packages` | Filter by packages |
| `MARKETPLACE_PRACTITIONERS` | `/marketplace/practitioners` | Browse practitioners |

## Service & Content Detail Pages

*Note: These paths require an `id` parameter*

| Constant | Path | Usage Example |
|----------|------|---------------|
| `SERVICE_DETAIL` | `/services/{id}` | `build_url('SERVICE_DETAIL', id=service.id)` |
| `SESSION_DETAIL` | `/sessions/{id}` | `build_url('SESSION_DETAIL', id=session.id)` |
| `WORKSHOP_DETAIL` | `/workshops/{id}` | `build_url('WORKSHOP_DETAIL', id=workshop.id)` |
| `COURSE_DETAIL` | `/courses/{id}` | `build_url('COURSE_DETAIL', id=course.id)` |
| `PRACTITIONER_PROFILE` | `/practitioners/{id}` | `build_url('PRACTITIONER_PROFILE', id=practitioner.id)` |
| `BUNDLE_DETAIL` | `/bundles/{id}` | `build_url('BUNDLE_DETAIL', id=bundle.id)` |
| `PACKAGE_DETAIL` | `/packages/{id}` | `build_url('PACKAGE_DETAIL', id=package.id)` |
| `STREAM_DETAIL` | `/streams/{id}` | `build_url('STREAM_DETAIL', id=stream.id)` |

## User Dashboard

| Constant | Path | Description |
|----------|------|-------------|
| `USER_DASHBOARD` | `/dashboard/user` | Main user dashboard |
| `USER_BOOKINGS` | `/dashboard/user/bookings` | User's bookings list |
| `USER_BOOKING_DETAIL` | `/dashboard/user/bookings/{id}` | Booking detail page (requires `id`) |
| `USER_BOOKING_RESCHEDULE` | `/dashboard/user/bookings/{id}/reschedule` | Reschedule booking (requires `id`) |
| `USER_PROFILE` | `/dashboard/user/profile` | User profile settings |
| `USER_MESSAGES` | `/dashboard/user/messages` | User messages/inbox |
| `USER_FAVORITES` | `/dashboard/user/favorites` | Saved practitioners/services |
| `USER_STREAMS` | `/dashboard/user/streams` | User's stream content |
| `USER_SUBSCRIPTIONS` | `/dashboard/user/subscriptions` | User subscriptions |
| `USER_REFERRAL` | `/dashboard/user/referral` | Referral program page |

## Practitioner Dashboard - Main

| Constant | Path | Description |
|----------|------|-------------|
| `PRACTITIONER_DASHBOARD` | `/dashboard/practitioner` | Main practitioner dashboard |
| `PRACTITIONER_BOOKINGS` | `/dashboard/practitioner/bookings` | Practitioner bookings list |
| `PRACTITIONER_BOOKING_DETAIL` | `/dashboard/practitioner/bookings/{id}` | Booking detail (requires `id`) |
| `PRACTITIONER_CALENDAR` | `/dashboard/practitioner/calendar` | Practitioner calendar |
| `PRACTITIONER_MESSAGES` | `/dashboard/practitioner/messages` | Messages/inbox |
| `PRACTITIONER_PROFILE` | `/dashboard/practitioner/profile` | Profile settings |
| `PRACTITIONER_SETTINGS` | `/dashboard/practitioner/settings` | Account settings |
| `PRACTITIONER_AVAILABILITY` | `/dashboard/practitioner/availability` | Set availability/schedule |
| `PRACTITIONER_ANALYTICS` | `/dashboard/practitioner/analytics` | Analytics dashboard |
| `PRACTITIONER_CLIENTS` | `/dashboard/practitioner/clients` | Client list |
| `PRACTITIONER_CLIENT_DETAIL` | `/dashboard/practitioner/clients/{id}` | Client detail (requires `id`) |
| `PRACTITIONER_REFERRALS` | `/dashboard/practitioner/referrals` | Referral tracking |
| `PRACTITIONER_STREAMS` | `/dashboard/practitioner/streams` | Manage stream content |

## Practitioner Dashboard - Services

| Constant | Path | Description |
|----------|------|-------------|
| `PRACTITIONER_SERVICES` | `/dashboard/practitioner/services` | Services list/management |
| `PRACTITIONER_SERVICE_NEW` | `/dashboard/practitioner/services/new` | Create new service |
| `PRACTITIONER_SERVICE_CREATE` | `/dashboard/practitioner/services/create` | Create service form |
| `PRACTITIONER_SERVICE_EDIT` | `/dashboard/practitioner/services/edit/{id}` | Edit service (requires `id`) |

## Practitioner Dashboard - Finances

| Constant | Path | Description |
|----------|------|-------------|
| `PRACTITIONER_FINANCES` | `/dashboard/practitioner/finances` | Finances main page |
| `PRACTITIONER_FINANCES_OVERVIEW` | `/dashboard/practitioner/finances/overview` | Financial overview |
| `PRACTITIONER_FINANCES_EARNINGS` | `/dashboard/practitioner/finances/earnings` | Earnings breakdown |
| `PRACTITIONER_FINANCES_PAYOUTS` | `/dashboard/practitioner/finances/payouts` | Payout history/requests |
| `PRACTITIONER_FINANCES_TRANSACTIONS` | `/dashboard/practitioner/finances/transactions` | Transaction history |

## Video Rooms

*Note: These paths require specific parameter names (not just `id`)*

| Constant | Path | Usage Example |
|----------|------|---------------|
| `ROOM_LOBBY` | `/room/{room_id}/lobby` | `build_url('ROOM_LOBBY', room_id=room.uuid)` |
| `ROOM_BOOKING_LOBBY` | `/room/booking/{booking_id}/lobby` | `build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id)` |
| `ROOM_SESSION_LOBBY` | `/room/session/{session_id}/lobby` | `build_url('ROOM_SESSION_LOBBY', session_id=session.id)` |

## Authentication & Onboarding

| Constant | Path | Description |
|----------|------|-------------|
| `AUTH_LOGIN` | `/auth/login` | Login page |
| `AUTH_SIGNUP` | `/auth/signup` | Signup page |
| `BECOME_PRACTITIONER` | `/become-practitioner` | Practitioner application |
| `WAITLIST` | `/waitlist` | Join waitlist |

## Other

| Constant | Path | Description |
|----------|------|-------------|
| `CHECKOUT` | `/checkout` | Checkout page |
| `STREAMS` | `/streams` | Streams content hub |

---

## Usage Examples by Email Type

### Client Welcome Email
```python
from emails.constants import build_url

context = {
    'marketplace_url': build_url('MARKETPLACE'),
    'help_url': build_url('HELP'),
    'profile_url': build_url('USER_PROFILE'),
}
```

### Client Booking Confirmation
```python
context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
    'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id),
    'reschedule_url': build_url('USER_BOOKING_RESCHEDULE', id=booking.id),
    'practitioner_url': build_url('PRACTITIONER_PROFILE', id=practitioner.id),
}
```

### Client Booking Reminder (24h)
```python
context = {
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
    'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id),
    'reschedule_url': build_url('USER_BOOKING_RESCHEDULE', id=booking.id),
    'messages_url': build_url('USER_MESSAGES'),
}
```

### Practitioner Welcome Email
```python
context = {
    'dashboard_url': build_url('PRACTITIONER_DASHBOARD'),
    'services_url': build_url('PRACTITIONER_SERVICES'),
    'availability_url': build_url('PRACTITIONER_AVAILABILITY'),
    'profile_url': build_url('PRACTITIONER_PROFILE'),
}
```

### Practitioner Booking Received
```python
context = {
    'booking_url': build_url('PRACTITIONER_BOOKING_DETAIL', id=booking.id),
    'client_url': build_url('PRACTITIONER_CLIENT_DETAIL', id=client.id),
    'calendar_url': build_url('PRACTITIONER_CALENDAR'),
    'bookings_list_url': build_url('PRACTITIONER_BOOKINGS'),
}
```

### Practitioner Payout Completed
```python
context = {
    'payouts_url': build_url('PRACTITIONER_FINANCES_PAYOUTS'),
    'earnings_url': build_url('PRACTITIONER_FINANCES_EARNINGS'),
    'transactions_url': build_url('PRACTITIONER_FINANCES_TRANSACTIONS'),
    'finances_url': build_url('PRACTITIONER_FINANCES'),
}
```

### Review Request
```python
context = {
    'service_url': build_url('SERVICE_DETAIL', id=service.id),
    'practitioner_url': build_url('PRACTITIONER_PROFILE', id=practitioner.id),
    'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
}
```

---

## In MJML Templates

### Using Pre-Built URLs (Recommended)
```html
<!-- URLs built in service and passed to template -->
<mj-button href="{{ booking_url }}">View Booking</mj-button>
<mj-button href="{{ join_url }}">Join Session</mj-button>
```

### Using Static Paths
```html
<!-- For links that don't need parameters -->
<mj-text>
  <a href="{{ WEBSITE_URL }}{{ URL_PATHS.HELP }}">Help Center</a> ·
  <a href="{{ WEBSITE_URL }}{{ URL_PATHS.PRIVACY }}">Privacy</a>
</mj-text>
```

### Building URLs in Template
```html
<!-- If you need to build a URL in the template -->
<mj-button href="{{ build_url('USER_DASHBOARD') }}">
  Go to Dashboard
</mj-button>

<!-- With parameters (if available in context) -->
<mj-button href="{{ build_url('SERVICE_DETAIL', id=service.id) }}">
  View Service
</mj-button>
```

---

## Parameter Names Reference

Most paths use `id` as the parameter, but some use specific names:

| Path Type | Parameter Name | Example |
|-----------|---------------|---------|
| Most detail pages | `id` | `build_url('USER_BOOKING_DETAIL', id=123)` |
| Room lobby | `room_id` | `build_url('ROOM_LOBBY', room_id='abc-123')` |
| Booking room lobby | `booking_id` | `build_url('ROOM_BOOKING_LOBBY', booking_id=456)` |
| Session room lobby | `session_id` | `build_url('ROOM_SESSION_LOBBY', session_id=789)` |

---

**For full documentation, see:** `/backend/emails/URL_LINKS_GUIDE.md`
