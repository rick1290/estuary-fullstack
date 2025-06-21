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