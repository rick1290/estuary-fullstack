# Courier Email Integration

This integration provides email notification functionality using the [Courier](https://www.courier.com/) API.

## Overview

The Courier integration allows you to:

1. Send transactional emails using templates or dynamic content
2. Track email delivery and engagement
3. Manage email templates in the Courier dashboard

## Setup

### Installation

1. Install the Courier Python package:

```bash
pip install trycourier
```

2. Add the package to your requirements.txt:

```
trycourier==4.2.0
```

3. Add your Courier API key to your environment variables:

```
COURIER_AUTH_TOKEN=your_courier_api_key
```

### Configuration

You can configure the following settings in your Django settings file:

```python
# Courier API settings
COURIER_AUTH_TOKEN = os.environ.get('COURIER_AUTH_TOKEN')

# Template IDs (optional)
COURIER_WELCOME_TEMPLATE = 'your-welcome-template-id'
COURIER_BOOKING_CONFIRMATION_TEMPLATE = 'your-booking-confirmation-template-id'
COURIER_BOOKING_REMINDER_TEMPLATE = 'your-booking-reminder-template-id'
COURIER_PAYMENT_RECEIPT_TEMPLATE = 'your-payment-receipt-template-id'
COURIER_CREDIT_PURCHASE_TEMPLATE = 'your-credit-purchase-template-id'
COURIER_PASSWORD_RESET_TEMPLATE = 'your-password-reset-template-id'
```

## Usage

### Basic Usage

```python
from apps.integrations.courier.client import courier_client

# Send a simple email
response = courier_client.send_email(
    email="user@example.com",
    subject="Hello from Estuary",
    body="This is a test email from the Courier integration."
)

# Send an email with template
response = courier_client.send_email(
    email="user@example.com",
    template_id="your-template-id",
    data={
        "name": "John Doe",
        "product": "Estuary"
    }
)
```

### Pre-built Email Notifications

The integration includes several pre-built email notification functions:

```python
from apps.integrations.courier.utils import (
    send_booking_confirmation,
    send_booking_reminder,
    send_payment_receipt,
    send_credit_purchase_confirmation,
    send_welcome_email,
    send_password_reset_email
)

# Send booking confirmation
send_booking_confirmation(booking)

# Send booking reminder
send_booking_reminder(booking, hours_before=24)

# Send payment receipt
send_payment_receipt(order)

# Send credit purchase confirmation
send_credit_purchase_confirmation(credit_transaction)

# Send welcome email
send_welcome_email(user)

# Send password reset email
send_password_reset_email(user, reset_token)
```

### Async Support

For high-performance applications, you can use the async client:

```python
import asyncio
from apps.integrations.courier.client import courier_client

async def send_emails():
    await courier_client.send_email_async(
        email="user@example.com",
        subject="Hello from Estuary",
        body="This is a test email from the Courier integration."
    )

# Run in an async context
asyncio.run(send_emails())
```

## Templates

You can create and manage email templates in the Courier dashboard. Templates support:

1. Dynamic content with variables
2. Responsive design
3. Brand customization
4. A/B testing
5. Analytics and tracking

## Idempotency

All email sending functions support idempotency keys to prevent duplicate emails. The integration automatically generates idempotency keys based on the content and timestamp.

## Error Handling

The integration includes comprehensive error handling and logging. All errors are logged and returned in the response object.

## Security

The integration follows security best practices:

1. API keys are stored in environment variables
2. All API requests use HTTPS
3. No sensitive data is logged

## Troubleshooting

If emails are not being sent:

1. Check that your `COURIER_AUTH_TOKEN` is correctly set
2. Verify that the recipient email is valid
3. Check the logs for any error messages
4. Verify your Courier account status in the dashboard

## Resources

- [Courier Documentation](https://www.courier.com/docs/)
- [Python SDK Reference](https://www.courier.com/docs/reference/sdks/python/)
- [Courier Dashboard](https://app.courier.com/)
