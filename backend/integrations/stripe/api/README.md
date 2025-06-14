# Stripe FastAPI Checkout System

This module provides a comprehensive FastAPI-based checkout system for the Estuary platform, supporting single sessions, bundles, and packages.

## Overview

The checkout system is built with FastAPI and integrates seamlessly with Django models and Temporal workflows. It provides a modern, async API for handling payments through Stripe.

## Features

- **Multiple Checkout Types**:
  - Single session bookings
  - Bundle purchases (credits)
  - Package purchases (multiple services)

- **Payment Features**:
  - Stripe payment intent integration
  - Save payment methods for future use
  - Apply user credits to reduce payment amount
  - Support for coupons (foundation laid)

- **Workflow Integration**:
  - Automatically triggers Temporal workflows on successful payment
  - Handles booking lifecycle management
  - Supports complex package/bundle logic

## API Endpoints

### Core Checkout Endpoints

1. **Create Checkout Session**
   ```
   POST /stripe/fastapi/api/v1/stripe/checkout/create
   ```
   Creates a checkout session for purchasing services.

2. **Calculate Price**
   ```
   POST /stripe/fastapi/api/v1/stripe/checkout/calculate-price
   ```
   Calculates pricing without creating a checkout session.

3. **Confirm Payment**
   ```
   POST /stripe/fastapi/api/v1/stripe/payment/confirm
   ```
   Confirms a payment and completes the checkout process.

4. **Check Status**
   ```
   POST /stripe/fastapi/api/v1/stripe/checkout/status
   ```
   Gets the status of a checkout session.

### Additional Endpoints

5. **Get Payment Methods**
   ```
   GET /stripe/fastapi/api/v1/stripe/payment-methods
   ```
   Returns saved payment methods for the user.

6. **Get Credit Balance**
   ```
   GET /stripe/fastapi/api/v1/stripe/credits/balance
   ```
   Returns the user's credit balance.

## Usage Examples

### Single Session Checkout

```python
# Request
POST /stripe/fastapi/api/v1/stripe/checkout/create
{
    "checkout_type": "single_session",
    "items": [{
        "service_id": 123,
        "practitioner_id": 456,
        "start_time": "2024-01-15T10:00:00Z",
        "end_time": "2024-01-15T11:00:00Z",
        "quantity": 1
    }],
    "save_payment_method": true,
    "use_credits": true
}

# Response
{
    "checkout_session_id": null,
    "payment_intent_id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abcdef",
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "subtotal_cents": 10000,
    "tax_cents": 875,
    "credits_applied_cents": 2000,
    "total_cents": 8875,
    "requires_payment": true
}
```

### Bundle Purchase

```python
# Request
POST /stripe/fastapi/api/v1/stripe/checkout/create
{
    "checkout_type": "bundle",
    "items": [{
        "service_id": 789,
        "practitioner_id": 456,
        "quantity": 1
    }],
    "save_payment_method": false
}
```

### Package Purchase

```python
# Request
POST /stripe/fastapi/api/v1/stripe/checkout/create
{
    "checkout_type": "package",
    "items": [{
        "service_id": 999,
        "practitioner_id": 456,
        "quantity": 1,
        "child_selections": {
            "101": {"selected": true, "quantity": 2},
            "102": {"selected": true, "quantity": 1}
        }
    }]
}
```

## Architecture

### Components

1. **schemas.py**: Pydantic models for request/response validation
2. **services.py**: Business logic layer handling checkout operations
3. **endpoints.py**: FastAPI route handlers
4. **app.py**: FastAPI application configuration

### Integration Points

1. **Django Models**: Uses existing Django ORM models
2. **Temporal Workflows**: Triggers booking lifecycle workflows
3. **Stripe Client**: Integrates with existing Stripe client wrapper

## Testing

Use the management command to test the checkout flow:

```bash
python manage.py test_stripe_checkout --user-email user@example.com --checkout-type session
```

## API Documentation

Interactive API documentation is available at:
- Swagger UI: `/stripe/fastapi/stripe/docs`
- ReDoc: `/stripe/fastapi/stripe/redoc`

## Error Handling

The API provides consistent error responses:

```json
{
    "error": "Error message",
    "details": {
        "field": "Additional context"
    },
    "code": "ERROR_CODE"
}
```

## Security

- All endpoints require authentication
- CSRF protection is handled by Django middleware
- Payment method IDs are validated against Stripe
- User can only access their own orders and bookings

## Future Enhancements

1. **Coupon System**: Full implementation of discount codes
2. **Subscription Support**: Recurring payment handling
3. **Multi-currency**: Support for international payments
4. **Refunds API**: Automated refund processing
5. **Payment Links**: Shareable checkout links