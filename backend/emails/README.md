# Estuary Email System

Modern email system using **Resend** for sending and **MJML** for responsive email templates.

## Features

- 🎨 **Branded Templates**: Earth-inspired design matching frontend
- 📱 **Fully Responsive**: MJML ensures perfect rendering across all email clients
- 🔄 **Reusable Components**: DRY principle with shared components
- 🚀 **Easy to Extend**: Add new templates quickly
- 📊 **Template Tracking**: Resend tags for analytics

## Structure

```
emails/
├── templates/emails/
│   ├── base.mjml                 # Base layout with branding
│   ├── components/               # Reusable components
│   │   ├── button.mjml
│   │   ├── booking_card.mjml
│   │   └── practitioner_card.mjml
│   ├── clients/                  # Client email templates
│   │   ├── welcome.mjml
│   │   ├── booking_confirmation.mjml
│   │   └── reminder.mjml
│   └── practitioners/            # Practitioner templates
│       ├── welcome.mjml
│       └── booking_received.mjml
├── services.py                   # Email sending service layer
├── utils.py                      # MJML compilation & rendering
└── constants.py                  # Email types & subjects
```

## Installation

### 1. Install Python Dependencies

```bash
pip install resend
```

### 2. Install MJML CLI

```bash
npm install -g mjml
```

### 3. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Add to `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_LOGO_URL=https://your-cdn.com/logo.png
WEBSITE_URL=https://estuary.com
SUPPORT_EMAIL=support@estuary.com
```

### 4. Add to Django Settings

```python
# settings.py

INSTALLED_APPS = [
    # ... other apps
    'emails',
]

# Email Configuration
RESEND_API_KEY = env('RESEND_API_KEY')
EMAIL_LOGO_URL = env('EMAIL_LOGO_URL', default='https://estuary.com/logo.png')
WEBSITE_URL = env('WEBSITE_URL', default='https://estuary.com')
SUPPORT_EMAIL = env('SUPPORT_EMAIL', default='support@estuary.com')
```

## Usage

### Sending Emails

```python
from emails.services import ClientEmailService, PractitionerEmailService

# Client emails
ClientEmailService.send_welcome_email(user)
ClientEmailService.send_booking_confirmation(booking)
ClientEmailService.send_reminder(booking, reminder_type='24h')

# Practitioner emails
PractitionerEmailService.send_welcome_email(practitioner)
PractitionerEmailService.send_booking_received(booking)
PractitionerEmailService.send_payout_completed(payout)
```

### Creating New Templates

1. **Create MJML template** in appropriate directory:

```mjml
{% extends "emails/base.mjml" %}

{% block content %}
<mj-section>
  <mj-column>
    <mj-text>Your content here</mj-text>
    {% include 'emails/components/button.mjml' with button_text="Click Me" button_url="https://..." %}
  </mj-column>
</mj-section>
{% endblock %}
```

2. **Add to constants.py**:

```python
CLIENT_EMAILS = {
    # ... existing
    'NEW_TEMPLATE': 'clients/new_template.mjml',
}

EMAIL_SUBJECTS = {
    'CLIENT_NEW_TEMPLATE': 'Your Subject Here',
}
```

3. **Add service method** in `services.py`:

```python
@staticmethod
def send_new_email(user):
    return EmailService.send_template_email(
        to=user.email,
        template_path=CLIENT_EMAILS['NEW_TEMPLATE'],
        context={'user': user},
        subject=EMAIL_SUBJECTS['CLIENT_NEW_TEMPLATE'],
        tags=[{'name': 'category', 'value': 'notification'}],
    )
```

## Available Components

### Button

```mjml
{% include 'emails/components/button.mjml' with
   button_text="Click Me"
   button_url="https://..."
   button_color="#7a8b63"
%}
```

### Booking Card

```mjml
{% include 'emails/components/booking_card.mjml' %}
<!-- Requires: booking, service in context -->
```

### Practitioner Card

```mjml
{% include 'emails/components/practitioner_card.mjml' %}
<!-- Requires: practitioner in context -->
```

## Replacing Courier

### Before (Courier):

```python
from estuary.courier_config import get_client_template
from trycourier import Courier

client = Courier(auth_token=settings.COURIER_API_KEY)
client.send_message(
    message={
        "to": {"email": user.email},
        "template": get_client_template('WELCOME'),
        "data": {"first_name": user.first_name},
    }
)
```

### After (Resend):

```python
from emails.services import ClientEmailService

ClientEmailService.send_welcome_email(user)
```

## Testing Emails Locally

```python
# In Django shell or management command
from emails.utils import EmailRenderer

# Render without sending
html = EmailRenderer.render_email(
    'clients/welcome.mjml',
    {'first_name': 'Test', 'user': user}
)

# Save to file for preview
with open('test_email.html', 'w') as f:
    f.write(html)
```

## Brand Colors

All colors from frontend design system:

- **Primary (Sage)**: `#7a8b63`
- **Secondary (Terracotta)**: `#cc8156`
- **Text (Olive)**: `#3c412a`
- **Background (Cream)**: `#fdfcf8`
- **Border**: `#e2d5bd`

## Email Types

### Client Emails (12)
- Welcome
- Email Verification
- Booking Confirmation
- Payment Success
- Session Confirmation
- Reminder (24h & 30m)
- Booking Cancelled
- Booking Rescheduled
- Credit Purchase
- Review Request
- Message Notification
- Booking Completed Review

### Practitioner Emails (15)
- Welcome
- Profile Incomplete
- No Services
- Service Created
- Bundle Created
- Booking Received
- Booking Cancelled
- Booking Rescheduled
- Payout Completed
- Reminder (24h & 30m)
- New Review
- Earnings Summary
- Message Notification
- Verification Approved
- Verification Rejected

## Next Steps

1. ✅ Upload logo to Cloudflare R2 and update `EMAIL_LOGO_URL`
2. ⏳ Create remaining email templates (see constants.py for full list)
3. ⏳ Replace all Courier calls throughout the codebase
4. ⏳ Set up Resend webhook for bounce/complaint handling
5. ⏳ Add email preference management
6. ⏳ Test emails in staging environment

## Support

For questions or issues:
- Resend Docs: https://resend.com/docs
- MJML Docs: https://mjml.io/documentation
