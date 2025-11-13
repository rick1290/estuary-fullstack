# Quick Start Guide - 15 Minutes to First Email

Get your new email system up and running in 15 minutes.

## Step 1: Install Dependencies (3 mins)

```bash
# Terminal 1 - Python package
cd backend
pip install resend

# Terminal 2 - MJML CLI (needs Node.js)
npm install -g mjml

# Verify MJML installed
mjml --version
# Should show: mjml-cli: 4.x.x
```

## Step 2: Get Resend API Key (3 mins)

1. Go to [resend.com](https://resend.com)
2. Sign up (free account - 3,000 emails/month)
3. Click "API Keys" in sidebar
4. Click "Create API Key"
5. Name it "Estuary Dev"
6. Copy the key (starts with `re_`)

## Step 3: Configure Django (2 mins)

Add to `.env`:

```env
# Email Configuration
RESEND_API_KEY=re_your_actual_key_here
EMAIL_LOGO_URL=https://estuary.com/logo.png
WEBSITE_URL=http://localhost:3000
SUPPORT_EMAIL=hello@estuary.com
```

Add to `estuary/settings.py` (at the bottom):

```python
# ============================
# Email Configuration
# ============================
RESEND_API_KEY = env('RESEND_API_KEY')
EMAIL_LOGO_URL = env('EMAIL_LOGO_URL', default='https://estuary.com/logo.png')
WEBSITE_URL = env('WEBSITE_URL', default='https://estuary.com')
SUPPORT_EMAIL = env('SUPPORT_EMAIL', default='support@estuary.com')
```

Add `'emails'` to `INSTALLED_APPS` in `estuary/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'emails',  # Add this line
]
```

## Step 4: Test It Works (5 mins)

### Option A: Django Shell

```bash
python manage.py shell
```

```python
# Test rendering (no email sent)
from emails.utils import EmailRenderer

html = EmailRenderer.render_email(
    'clients/welcome.mjml',
    {'first_name': 'Test User'}
)

print("✓ Template rendered successfully!")
print(f"HTML length: {len(html)} characters")

# Test actual sending
from emails.services import ClientEmailService
from users.models import User

# Use your own email for testing
user = User.objects.filter(email='your@email.com').first()

if user:
    response = ClientEmailService.send_welcome_email(user)
    print(f"✓ Email sent! ID: {response.get('id')}")
    print("Check your inbox!")
else:
    print("Create a user with your email first")
```

### Option B: Management Command

Create a test command:

```bash
# backend/users/management/commands/test_email.py
```

```python
from django.core.management.base import BaseCommand
from emails.services import ClientEmailService
from users.models import User

class Command(BaseCommand):
    help = 'Test email sending'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to send test to')

    def handle(self, *args, **options):
        email = options['email']

        # Create or get user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={'first_name': 'Test', 'last_name': 'User'}
        )

        # Send welcome email
        try:
            response = ClientEmailService.send_welcome_email(user)
            self.stdout.write(
                self.style.SUCCESS(f'✓ Email sent successfully! ID: {response.get("id")}')
            )
            self.stdout.write('Check your inbox!')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to send email: {str(e)}')
            )
```

Run it:

```bash
python manage.py test_email your@email.com
```

## Step 5: View in Browser (2 mins)

Want to see what the email looks like without sending?

```python
# In Django shell
from emails.utils import EmailRenderer

html = EmailRenderer.render_email(
    'clients/welcome.mjml',
    {'first_name': 'John', 'WEBSITE_URL': 'https://estuary.com'}
)

# Save to file
with open('/tmp/test_email.html', 'w') as f:
    f.write(html)

print("Open /tmp/test_email.html in your browser!")
```

Then open `/tmp/test_email.html` in Chrome/Safari/Firefox.

## Troubleshooting

### Error: "MJML CLI not found"

**Problem:** `mjml` command not in PATH

**Fix:**
```bash
# Make sure Node.js is installed
node --version

# Install MJML globally
npm install -g mjml

# Verify
which mjml
```

### Error: "Resend API key invalid"

**Problem:** API key not set or incorrect

**Fix:**
1. Check `.env` file has correct key
2. Restart Django server to reload environment
3. Test key directly:

```python
import resend
resend.api_key = "re_your_key"
resend.Emails.send({
    "from": "Estuary <onboarding@resend.dev>",  # Use resend.dev for testing
    "to": ["your@email.com"],
    "subject": "Test",
    "html": "<p>Test email</p>"
})
```

### Error: "Template does not exist"

**Problem:** Django can't find email templates

**Fix:**
1. Verify directory structure:
```bash
ls backend/emails/templates/emails/
# Should show: base.mjml, components/, clients/, practitioners/
```

2. Verify `emails` app is in `INSTALLED_APPS`

### Email Not Arriving

**Problem:** Email sent but not received

**Checks:**
1. Check spam folder
2. Verify email in Resend dashboard: https://resend.com/emails
3. Check if domain is verified (for production)
4. For dev, use `onboarding@resend.dev` as from address

## What's Next?

### Immediate:
- ✅ You just sent your first email!
- ✅ System is working

### Short Term (Next Hour):
1. Send test booking confirmation
2. Send test reminder
3. View all templates in browser

### Medium Term (This Week):
1. Create remaining templates
2. Replace Courier calls
3. Test in staging
4. Deploy!

## Helpful Commands

```bash
# Test welcome email
python manage.py shell -c "from emails.services import ClientEmailService; from users.models import User; ClientEmailService.send_welcome_email(User.objects.first())"

# View all templates
find backend/emails/templates -name "*.mjml"

# Check for Courier usage (to replace)
grep -r "trycourier" backend/ --include="*.py"

# See Resend logs
# Visit: https://resend.com/emails
```

## Resources

- **Resend Dashboard**: https://resend.com/emails
- **Resend Docs**: https://resend.com/docs
- **MJML Docs**: https://mjml.io/documentation
- **Your Templates**: `backend/emails/templates/emails/`
- **Usage Examples**: `backend/emails/README.md`
- **Migration Guide**: `backend/emails/MIGRATION_PLAN.md`

## Success! 🎉

You now have:
- ✅ Email system installed
- ✅ Dependencies configured
- ✅ First email sent
- ✅ Templates ready to use

**Time to fully migrate from Courier**: ~4-6 hours

**Cost savings**: ~30-50%

**Developer happiness**: 📈📈📈

Ready to create more templates? Check out `SUMMARY.md` for next steps!
