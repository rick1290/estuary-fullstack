# Migration from Courier to Resend

Complete step-by-step plan to migrate from Courier to Resend.

## Phase 1: Setup & Configuration (30 mins)

### 1. Install Dependencies

```bash
cd backend
pip install resend
pip freeze > requirements.txt

# Install MJML globally
npm install -g mjml
```

### 2. Get Resend API Key

1. Sign up at [resend.com](https://resend.com) (Free tier: 3,000 emails/month, $20/mo for 100k)
2. Verify your domain (or use dev mode with their domain)
3. Create API key from dashboard
4. Add to `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 3. Upload Logo

Upload `logo.png` to Cloudflare R2:

```bash
# Using AWS CLI with R2 credentials
aws s3 cp emails/static/logo.png s3://your-bucket/emails/logo.png --endpoint-url=https://xxxxx.r2.cloudflarestorage.com
```

Update `.env`:
```env
EMAIL_LOGO_URL=https://your-cdn.com/emails/logo.png
```

### 4. Update Django Settings

Add to `estuary/settings.py`:

```python
# Email Configuration (add to bottom)
RESEND_API_KEY = env('RESEND_API_KEY')
EMAIL_LOGO_URL = env('EMAIL_LOGO_URL', default='https://estuary.com/logo.png')
WEBSITE_URL = env('WEBSITE_URL', default='https://estuary.com')
SUPPORT_EMAIL = env('SUPPORT_EMAIL', default='support@estuary.com')

# Add emails to INSTALLED_APPS
INSTALLED_APPS = [
    # ... existing apps
    'emails',  # Add this
]
```

### 5. Test Email Rendering

```bash
python manage.py shell
```

```python
from emails.utils import EmailRenderer
from users.models import User

user = User.objects.first()
html = EmailRenderer.render_email(
    'clients/welcome.mjml',
    {'first_name': user.first_name, 'user': user}
)
print("✓ Email rendered successfully!")
```

## Phase 2: Replace Email Calls (2-3 hours)

### Files to Update

Search for all Courier usage:

```bash
cd backend
grep -r "from trycourier import Courier" --include="*.py"
grep -r "get_client_template\|get_practitioner_template" --include="*.py"
```

### Common Replacements

#### 1. Welcome Emails

**Before:**
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

**After:**
```python
from emails.services import ClientEmailService

ClientEmailService.send_welcome_email(user)
```

#### 2. Booking Confirmations

**Before:**
```python
client.send_message(
    message={
        "to": {"email": booking.user.email},
        "template": get_client_template('BOOKING_CONFIRMATION'),
        "data": {
            "booking_id": booking.id,
            "service_name": booking.service.title,
            # ... more data
        },
    }
)
```

**After:**
```python
from emails.services import ClientEmailService

ClientEmailService.send_booking_confirmation(booking)
```

#### 3. Reminders

**Before:**
```python
# For 24h
client.send_message(
    message={
        "to": {"email": booking.user.email},
        "template": get_client_template('REMINDER_24H'),
        "data": {...},
    }
)

# For 30m
client.send_message(
    message={
        "to": {"email": booking.user.email},
        "template": get_client_template('REMINDER_30M'),
        "data": {...},
    }
)
```

**After:**
```python
from emails.services import ClientEmailService

# Single function handles both
ClientEmailService.send_reminder(booking, reminder_type='24h')
ClientEmailService.send_reminder(booking, reminder_type='30m')
```

### Files Likely to Update

Based on typical Django structure:

1. **users/signals.py** or **users/views.py**
   - User welcome emails
   - Email verification

2. **bookings/services.py** or **bookings/signals.py**
   - Booking confirmations
   - Booking cancellations
   - Booking rescheduling

3. **bookings/tasks.py** (Celery)
   - Reminder emails (24h and 30m)

4. **payments/services.py** or **payments/signals.py**
   - Payment success
   - Credit purchases

5. **payouts/services.py**
   - Payout completed

6. **reviews/signals.py** or **reviews/services.py**
   - Review requests
   - New review notifications

7. **practitioners/signals.py** or **practitioners/views.py**
   - Practitioner welcome
   - Profile incomplete reminders
   - Verification approved/rejected

### Migration Checklist

```
Client Emails:
[ ] Welcome email
[ ] Email verification
[ ] Booking confirmation
[ ] Payment success
[ ] Session confirmation
[ ] 24-hour reminder
[ ] 30-minute reminder
[ ] Booking cancelled
[ ] Booking rescheduled
[ ] Credit purchase
[ ] Review request
[ ] Message notification
[ ] Booking completed review

Practitioner Emails:
[ ] Welcome email
[ ] Profile incomplete
[ ] No services reminder
[ ] Service created
[ ] Bundle created
[ ] Booking received
[ ] Booking cancelled
[ ] Booking rescheduled
[ ] Payout completed
[ ] 24-hour reminder
[ ] 30-minute reminder
[ ] New review
[ ] Earnings summary
[ ] Message notification
[ ] Verification approved
[ ] Verification rejected
```

## Phase 3: Testing (1-2 hours)

### 1. Unit Tests

```python
# emails/tests.py
from django.test import TestCase
from emails.services import ClientEmailService
from users.models import User

class EmailServiceTest(TestCase):
    def test_welcome_email(self):
        user = User.objects.create(
            email='test@example.com',
            first_name='Test'
        )

        response = ClientEmailService.send_welcome_email(user)
        self.assertIsNotNone(response.get('id'))
```

### 2. Manual Testing

```python
python manage.py shell
```

```python
from emails.services import ClientEmailService, PractitionerEmailService
from users.models import User
from bookings.models import Booking

# Test client emails
user = User.objects.get(email='your@email.com')
ClientEmailService.send_welcome_email(user)

# Test booking confirmation
booking = Booking.objects.first()
ClientEmailService.send_booking_confirmation(booking)

# Test reminders
ClientEmailService.send_reminder(booking, '24h')

# Test practitioner emails
practitioner = user.practitioner
PractitionerEmailService.send_welcome_email(practitioner)
PractitionerEmailService.send_booking_received(booking)
```

### 3. Test in Staging

1. Deploy to staging
2. Create test bookings
3. Trigger reminders
4. Verify all emails received
5. Check rendering on different clients:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile devices

## Phase 4: Deployment (30 mins)

### 1. Create Remaining Templates

You have these core templates done:
- ✅ Client: welcome, booking_confirmation, reminder
- ✅ Practitioner: welcome, booking_received

Still need to create:
- [ ] Client: email_verification, payment_success, session_confirmation, booking_cancelled, booking_rescheduled, credit_purchase, review_request, message_notification, booking_completed_review
- [ ] Practitioner: profile_incomplete, no_services, service_created, bundle_created, booking_cancelled, booking_rescheduled, payout_completed, reminder, new_review, earnings_summary, message_notification, verification_approved, verification_rejected

### 2. Remove Courier

After full migration and testing:

```bash
# Remove from requirements.txt
pip uninstall trycourier

# Remove environment variables
# .env - delete:
# COURIER_API_KEY=...

# Remove old config file
# rm estuary/courier_config.py
```

### 3. Production Deployment

```bash
# 1. Deploy backend changes
git add .
git commit -m "Migrate from Courier to Resend for email system"
git push

# 2. Update production environment variables
# Add RESEND_API_KEY, EMAIL_LOGO_URL to production env

# 3. Install MJML on production server
npm install -g mjml

# 4. Deploy and monitor
# Check logs for any email sending errors
# Monitor Resend dashboard for deliverability
```

## Phase 5: Monitoring & Optimization

### 1. Set Up Resend Webhooks

Configure webhooks in Resend dashboard for:
- Email delivered
- Email bounced
- Email complained (spam)
- Email opened (if tracking enabled)

### 2. Track Email Performance

Monitor in Resend dashboard:
- Delivery rate
- Bounce rate
- Open rate (optional)
- Click rate (optional)

### 3. Email Preferences

Add user preference management:

```python
# users/models.py
class UserProfile:
    email_reminders = models.BooleanField(default=True)
    email_marketing = models.BooleanField(default=True)
    email_bookings = models.BooleanField(default=True)
```

## Cost Comparison

### Courier
- Unknown current cost
- Typically $0.50-1.00 per 1000 emails

### Resend
- **Free**: 3,000 emails/month, 100 emails/day
- **$20/month**: 100,000 emails/month
- **$80/month**: 1,000,000 emails/month

For a wellness platform, estimate ~5-10 emails per booking:
- 1,000 bookings/month = 5,000-10,000 emails = **$20/month**
- Very affordable!

## Rollback Plan

If issues arise:

1. Keep Courier code in git history
2. Revert commit: `git revert <commit-hash>`
3. Re-add COURIER_API_KEY to env
4. Redeploy

## Timeline

- **Phase 1 (Setup)**: 30 minutes
- **Phase 2 (Replace Calls)**: 2-3 hours
- **Phase 3 (Testing)**: 1-2 hours
- **Phase 4 (Deploy)**: 30 minutes
- **Phase 5 (Monitor)**: Ongoing

**Total Estimated Time**: 4-6 hours

## Success Criteria

✅ All 27 email types migrated
✅ All emails rendering correctly across clients
✅ No email delivery failures
✅ Faster email delivery than Courier
✅ Lower monthly cost
✅ Full code ownership of templates

## Support During Migration

If stuck, check:
1. Resend logs in dashboard
2. Django logs: `tail -f logs/django.log`
3. MJML compilation errors: Look for subprocess errors
4. Template context errors: Check template variables match context

Questions? Reference:
- `emails/README.md` - Usage guide
- `emails/constants.py` - All email types
- `emails/services.py` - Service layer examples
