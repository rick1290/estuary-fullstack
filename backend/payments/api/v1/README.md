# Payments API v1

This API provides comprehensive payment functionality for the Estuary platform, including payment processing, credit management, practitioner payouts, and subscription handling.

## Base URL
```
/api/v1/drf/payments/
```

## Authentication
All endpoints require authentication unless otherwise specified. Use Bearer token authentication:
```
Authorization: Bearer <token>
```

## Endpoints

### Payment Methods

#### List Payment Methods
```
GET /payment-methods/
```
Returns user's saved payment methods.

#### Add Payment Method
```
POST /payment-methods/
{
    "stripe_payment_method_id": "pm_1234567890",
    "is_default": true
}
```

#### Set Default Payment Method
```
POST /payment-methods/{id}/set_default/
```

#### Delete Payment Method
```
DELETE /payment-methods/{id}/
```

### Orders & Payments

#### List Orders
```
GET /payments/
```
Query parameters:
- `status`: Filter by order status
- `order_type`: Filter by order type
- `date_from`: Start date filter
- `date_to`: End date filter

#### Get Order Details
```
GET /payments/{id}/
```

### Checkout

#### Create Checkout Session
```
POST /checkout/create_session/
{
    "order_type": "direct|credit|subscription",
    "payment_method": "stripe",
    
    // For direct purchase
    "service_id": "uuid",
    
    // For credit purchase
    "credit_amount": "100.00",
    
    // For subscription
    "subscription_tier_id": "uuid",
    "is_annual": false,
    
    "success_url": "https://example.com/success",
    "cancel_url": "https://example.com/cancel"
}
```

### Credits

#### Get Credit Balance
```
GET /credits/balance/
```

#### List Credit Transactions
```
GET /credits/transactions/
```
Query parameters:
- `date_from`: Start date filter
- `date_to`: End date filter
- `type`: Transaction type filter

#### Purchase Credits
```
POST /credits/purchase/
{
    "amount": "100.00",
    "payment_method_id": "pm_1234567890",
    "save_payment_method": false
}
```

#### Transfer Credits
```
POST /credits/transfer/
{
    "recipient_email": "user@example.com",
    "amount": "50.00",
    "description": "Gift credits"
}
```

### Practitioner Earnings & Payouts

#### Get Earnings Balance (Practitioners Only)
```
GET /payouts/earnings/balance/
```

#### List Earnings Transactions (Practitioners Only)
```
GET /payouts/earnings/transactions/
```
Query parameters:
- `status`: Filter by status (pending, available, paid, reversed)
- `date_from`: Start date filter
- `date_to`: End date filter

#### Request Payout (Practitioners Only)
```
POST /payouts/request/
{
    "amount": "500.00",  // Optional, defaults to full available balance
    "notes": "Monthly payout"
}
```

#### List Payouts
```
GET /payouts/
```

### Subscriptions

#### List Subscription Tiers
```
GET /subscriptions/tiers/
```

#### Create Subscription (Practitioners Only)
```
POST /subscriptions/
{
    "tier_id": "uuid",
    "is_annual": false,
    "payment_method_id": "pm_1234567890"
}
```

#### Cancel Subscription
```
POST /subscriptions/{id}/cancel/
```

### Commission Information

#### Get Commission Rates (Practitioners Only)
```
GET /commission/rates/
```

#### Calculate Commission
```
POST /commission/calculate/
{
    "gross_amount": "100.00",
    "service_type_id": "uuid"
}
```

### Webhooks

#### Stripe Webhook (No Authentication Required)
```
POST /webhooks/stripe/
```
Headers required:
- `Stripe-Signature`: Webhook signature from Stripe

## Response Formats

### Success Response
```json
{
    "id": "uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    // ... other fields
}
```

### Error Response
```json
{
    "error": "Error message",
    "detail": "Detailed error information"
}
```

### Paginated Response
```json
{
    "count": 100,
    "next": "http://api.example.com/payments/?page=2",
    "previous": null,
    "results": [
        // ... items
    ]
}
```

## Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Filtering and Ordering

Most list endpoints support filtering and ordering:
- Add `?ordering=-created_at` for descending order by creation date
- Add `?ordering=total_amount_cents` for ascending order by amount
- Multiple filters can be combined: `?status=completed&date_from=2024-01-01`

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Authenticated users: 1000 requests per hour
- Webhook endpoints: No rate limiting

## Notes

1. All monetary amounts are in USD unless otherwise specified
2. Amounts in responses use decimal format (e.g., "100.00")
3. Cents fields in database are converted to decimal format in API responses
4. Stripe payment method IDs must be validated with Stripe before use
5. Webhook endpoints must verify Stripe signatures for security