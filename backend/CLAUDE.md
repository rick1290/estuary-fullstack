# Estuary Backend Documentation

## Overview
Django REST Framework backend for the Estuary wellness marketplace platform. Provides comprehensive APIs for practitioner-client connections, booking management, payment processing, and content delivery.

## Technical Stack

### Core Technologies
- **Framework**: Django 5.1.3
- **API**: Django REST Framework 3.15.2
- **Database**: PostgreSQL
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Storage**: Cloudflare R2
- **Real-time**: Django Channels + Redis
- **Video**: LiveKit integration
- **Payments**: Stripe with Connect
- **Task Queue**: Celery + Redis
- **Workflow**: Temporal
- **Monitoring**: Sentry

### Key Dependencies
- **django-cors-headers**: CORS support
- **django-filter**: Advanced filtering
- **drf-spectacular**: OpenAPI schema generation
- **django-storages**: Cloud storage backends
- **stripe**: Payment processing
- **livekit-server-sdk**: Video conferencing
- **boto3**: AWS/S3 compatible storage

## Architecture

### Django Apps Structure
```
/backend
  /users              # User management and authentication
  /practitioners      # Practitioner profiles and verification
  /services           # Service catalog management
  /packages           # Service packages
  /bundles            # Service bundles
  /bookings           # Booking system
  /payments           # Payment processing
  /credits            # Credit system
  /payouts            # Practitioner payouts
  /reviews            # Review and rating system
  /messaging          # Real-time messaging
  /streams            # Content streaming platform
  /notifications      # Notification system
  /analytics          # Analytics and reporting
  /media              # Media file handling
```

### Service Layer Architecture

The backend uses a service layer pattern to organize business logic, making the codebase more maintainable and testable. Services handle complex operations that span multiple models or require external integrations.

#### Core Services

**Payment Services** (`/payments/services/`)
- `PaymentService` - Handles Stripe payment processing, order creation, and refunds
- `CreditService` - Manages user credit transactions, balances, and transfers
- `EarningsService` - Calculates commissions and manages practitioner earnings
- `CheckoutOrchestrator` - Coordinates the entire checkout flow across multiple services
- `PayoutService` - Manages practitioner payout requests and eligibility checks
- `WebhookService` - Processes Stripe webhooks for payments, subscriptions, and refunds
- `CheckoutService` - Creates Stripe checkout sessions for services, credits, and subscriptions
- `SubscriptionService` - Manages practitioner subscription lifecycle and tier changes

**Booking Services** (`/bookings/services/`)
- `BookingService` - Creates bookings with explicit room creation, handles different service types

**Room Services** (`/rooms/services/`)
- `RoomService` - Manages LiveKit room creation and lifecycle

**Notification Services** (`/notifications/services/`)
- `NotificationService` - Coordinates client and practitioner notifications
- `ClientNotificationService` - Handles client-specific notifications
- `PractitionerNotificationService` - Handles practitioner-specific notifications

#### Service Layer Benefits

1. **Separation of Concerns**: Business logic is separated from views and models
2. **Reusability**: Services can be used by multiple views, management commands, or tasks
3. **Testability**: Services can be unit tested in isolation
4. **Explicit Behavior**: No hidden side effects through signals
5. **Transaction Management**: Services handle database transactions explicitly

#### Example Usage

```python
# In a view
from payments.services import CheckoutOrchestrator

orchestrator = CheckoutOrchestrator()
result = orchestrator.process_booking_payment(
    user=request.user,
    service_id=service_id,
    payment_method_id=payment_method_id,
    booking_data={
        'start_time': start_time,
        'end_time': end_time,
        'special_requests': notes
    }
)

if result.success:
    return Response({'booking': result.booking.id})
else:
    return Response({'error': result.error}, status=400)
```

#### When to Use Services

Create a service when:
- Business logic spans multiple models
- External APIs need to be called (Stripe, LiveKit, etc.)
- Complex calculations are required
- Multiple database operations need to be coordinated
- You need to ensure transactional consistency

Keep logic in models when:
- It's simple property calculations
- It's single-model validation
- It's data transformation for that model only

## Data Models

### Core Models

#### Users
```python
- User (Custom)
  - email (unique)
  - phone_number
  - is_practitioner
  - is_verified
  - created_at, updated_at

- UserProfile
  - user (OneToOne)
  - bio, avatar
  - timezone, location
  - preferences (JSONField)

- PaymentProfile
  - user (OneToOne)
  - stripe_customer_id
  - default_payment_method
```

#### Practitioners
```python
- Practitioner
  - user (OneToOne)
  - display_name
  - specializations
  - certifications
  - verification_status
  - stripe_account_id
  - commission_rate (default: 5%)
  - is_featured

- PractitionerSchedule
  - practitioner
  - day_of_week
  - start_time, end_time
  - is_available

- PractitionerLocation
  - practitioner
  - address, city, state
  - is_primary
  - is_virtual
```

#### Services
```python
- Service
  - practitioner
  - service_type (session/workshop/course)
  - title, description
  - price, duration
  - max_participants
  - category
  - is_active

- ServiceSchedule
  - service
  - date, start_time, end_time
  - available_spots
  - is_recurring

- Package
  - practitioner
  - services (M2M)
  - discount_percentage
  - valid_for_days

- Bundle
  - practitioner
  - services (M2M)
  - total_price
  - savings_amount
```

#### Bookings
```python
- Booking
  - user
  - service
  - status (pending/confirmed/completed/cancelled)
  - booking_date
  - start_time, end_time
  - total_amount
  - credits_applied
  - commission_amount
  - parent_booking (for course sessions)

- BookingParticipant
  - booking
  - user
  - attended
  - notes
```

#### Payments
```python
- Payment
  - user
  - booking
  - amount
  - stripe_payment_intent_id
  - status
  - created_at

- Credit
  - user
  - amount
  - source (purchase/refund/promotion)
  - expires_at
  - used_amount

- PractitionerEarning
  - practitioner
  - booking
  - gross_amount
  - commission_amount
  - net_amount
  - status (pending/available/paid)

- Payout
  - practitioner
  - amount
  - stripe_transfer_id
  - status
  - requested_at
  - completed_at
```

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/token/refresh/
POST   /api/v1/auth/logout/
GET    /api/v1/auth/user/
PUT    /api/v1/auth/user/
POST   /api/v1/auth/password/reset/
POST   /api/v1/auth/verify-email/
```

### Practitioners
```
GET    /api/v1/practitioners/
GET    /api/v1/practitioners/{id}/
POST   /api/v1/practitioners/apply/
PUT    /api/v1/practitioners/{id}/
GET    /api/v1/practitioners/{id}/services/
GET    /api/v1/practitioners/{id}/availability/
POST   /api/v1/practitioners/{id}/schedule/
GET    /api/v1/practitioners/{id}/reviews/
```

### Services
```
GET    /api/v1/services/
POST   /api/v1/services/
GET    /api/v1/services/{id}/
PUT    /api/v1/services/{id}/
DELETE /api/v1/services/{id}/
GET    /api/v1/services/{id}/schedule/
POST   /api/v1/services/{id}/schedule/
GET    /api/v1/services/categories/
```

### Bookings
```
GET    /api/v1/bookings/
POST   /api/v1/bookings/
GET    /api/v1/bookings/{id}/
PUT    /api/v1/bookings/{id}/
POST   /api/v1/bookings/{id}/cancel/
POST   /api/v1/bookings/{id}/reschedule/
GET    /api/v1/bookings/upcoming/
GET    /api/v1/bookings/history/
```

### Payments
```
POST   /api/v1/payments/create-intent/
POST   /api/v1/payments/confirm/
GET    /api/v1/payments/history/
GET    /api/v1/credits/balance/
POST   /api/v1/credits/purchase/
GET    /api/v1/credits/history/
```

### Practitioner Financials
```
GET    /api/v1/practitioner/earnings/
GET    /api/v1/practitioner/earnings/summary/
GET    /api/v1/practitioner/payouts/
POST   /api/v1/practitioner/payouts/request/
GET    /api/v1/practitioner/transactions/
```

### Streams (Content)
```
GET    /api/v1/streams/
POST   /api/v1/streams/
GET    /api/v1/streams/{id}/
PUT    /api/v1/streams/{id}/
DELETE /api/v1/streams/{id}/
POST   /api/v1/streams/{id}/like/
POST   /api/v1/streams/{id}/save/
GET    /api/v1/streams/{id}/comments/
POST   /api/v1/streams/{id}/comments/
```

### Messaging
```
GET    /api/v1/conversations/
POST   /api/v1/conversations/
GET    /api/v1/conversations/{id}/messages/
POST   /api/v1/conversations/{id}/messages/
WS     /ws/chat/{conversation_id}/
```

## Key Features Implementation

### Booking Flow
1. **Service Discovery**: Filter by type, category, location, availability
2. **Availability Check**: Real-time schedule validation
3. **Booking Creation**: 
   - Validate time slot availability
   - Calculate pricing with credits
   - Create Stripe payment intent
4. **Payment Processing**:
   - Charge customer
   - Allocate credits to practitioner
   - Calculate and track commission
5. **Confirmation**: Send notifications, update calendars

### Financial System
- **Commission Structure**:
  - Standard: 5%
  - High volume (>$5k/month): 4%
  - Premium (>$10k/month): 3%
- **Payout Flow**:
  - Minimum payout: $50
  - Weekly automatic payouts
  - Manual payout requests
  - Stripe Connect integration

### Real-time Features
- **WebSocket Endpoints**:
  - `/ws/chat/{conversation_id}/` - Messaging
  - `/ws/notifications/` - Real-time notifications
  - `/ws/booking-updates/` - Booking status updates

### Video Conferencing
- **LiveKit Integration**:
  - Automatic room creation for video sessions
  - Token generation for participants
  - Recording capabilities
  - Screen sharing support

## Authentication & Permissions

### User Roles
1. **Anonymous**: Public content only
2. **User**: Book services, manage profile
3. **Practitioner**: All user permissions + service management
4. **Admin**: Full system access

### JWT Configuration
- Access token lifetime: 60 minutes
- Refresh token lifetime: 7 days
- Sliding refresh tokens enabled

### Permission Classes
```python
- IsAuthenticated
- IsOwnerOrReadOnly
- IsPractitioner
- IsPractitionerOwner
- IsBookingParticipant
```

## API Best Practices

### Response Format
```json
{
  "status": "success|error",
  "data": {},
  "message": "Human readable message",
  "errors": {}
}
```

### Pagination
```json
{
  "count": 100,
  "next": "http://api/endpoint?page=2",
  "previous": null,
  "results": []
}
```

### Filtering
- Query parameters: `?category=yoga&price_min=50&price_max=200`
- Ordering: `?ordering=-created_at,price`
- Search: `?search=meditation`

### Rate Limiting
- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Practitioner endpoints: 2000 requests/hour

## Development Setup

### Environment Variables
```bash
# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/estuary

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Storage
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_SECRET_ACCESS_KEY=
CLOUDFLARE_BUCKET_NAME=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

# Email
EMAIL_HOST=
EMAIL_PORT=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Sentry
SENTRY_DSN=
```

### Local Development
```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Run
python manage.py runserver

# With Celery
celery -A config worker -l info
celery -A config beat -l info
```

## Testing

### Test Structure
```
/tests
  /unit         # Model and utility tests
  /integration  # API endpoint tests
  /e2e          # Full flow tests
```

### Running Tests
```bash
# All tests
python manage.py test

# Specific app
python manage.py test apps.bookings

# With coverage
coverage run --source='.' manage.py test
coverage report
```

## Deployment

### Production Checklist
- [ ] DEBUG = False
- [ ] Secret key rotated
- [ ] Database migrations run
- [ ] Static files collected
- [ ] CORS properly configured
- [ ] SSL certificates valid
- [ ] Monitoring enabled
- [ ] Backups configured

### Infrastructure
- **Web Server**: Gunicorn with Nginx
- **Database**: PostgreSQL 15+
- **Cache**: Redis
- **Queue**: Celery with Redis
- **Storage**: Cloudflare R2
- **Monitoring**: Sentry

## Booking Reminder System

The system uses a **periodic task** approach for sending booking reminders, which runs every 5 minutes:

### How it works:
1. `process-booking-reminders` task runs every 5 minutes
2. Checks for bookings that need 24-hour or 30-minute reminders
3. Sends reminders if not already sent (tracked in booking metadata)
4. Handles both individual and aggregated practitioner reminders

### Benefits:
- **Self-healing**: Automatically handles rescheduled bookings
- **Simple**: No complex task scheduling/cancellation logic
- **Reliable**: Survives system restarts
- **Efficient**: Only queries bookings in reminder windows

### Reminder Types:
- **24-hour reminders**: Sent 23:50 - 24:10 hours before
- **30-minute reminders**: Sent 25-35 minutes before
- **Aggregated**: Practitioners get one email for group sessions with all participants

### Celery Beat Configuration:
The periodic reminder task is already configured in `/backend/estuary/celery.py`:
```python
'process-booking-reminders': {
    'task': 'process-booking-reminders',
    'schedule': crontab(minute='*/5'),  # Every 5 minutes
    'options': {
        'expires': 240.0,  # Task expires after 4 minutes if not executed
    }
},
```