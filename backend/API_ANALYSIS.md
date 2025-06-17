# Estuary Django/DRF Backend API Analysis

## Overview
The backend is built with Django 5.1.3 and Django REST Framework (DRF) 3.15.2, following a modular app-based architecture with clear separation of concerns.

## Project Structure

### Core Django Apps

1. **users** - User authentication and profiles
   - Custom User model extending Django's AbstractUser
   - JWT authentication using djangorestframework-simplejwt
   - Profile models: UserProfile, UserSocialLinks, UserPaymentProfile
   - Favorite practitioners tracking

2. **practitioners** - Practitioner management
   - Practitioner profiles with verification system
   - Schedule management and availability
   - Certifications, education, and specializations
   - Onboarding workflow
   - Status: active, inactive, vacation, pending, suspended

3. **services** - Service catalog
   - ServiceCategory - Global categories
   - PractitionerServiceCategory - Practitioner-specific categories
   - Service - Main service model with pricing and duration
   - ServiceType - session, workshop, package, bundle, course
   - Support for virtual, in-person, and hybrid delivery

4. **bookings** - Booking system
   - Comprehensive booking lifecycle management
   - Status tracking: draft, pending_payment, confirmed, in_progress, completed, canceled
   - Payment status separate from booking status
   - Support for rescheduling and cancellations
   - Parent-child bookings for packages/bundles

5. **payments** - Financial system
   - Order management with Stripe integration
   - Credit-based system (UserCreditTransaction, UserCreditBalance)
   - Practitioner earnings and payouts
   - Subscription tiers for practitioners
   - Commission tracking

6. **locations** - Location management
   - Country, State, City, ZipCode models
   - PractitionerLocation for service locations
   - Address model for structured addresses

7. **reviews** - Review and rating system
   - Review model with ratings and responses
   - Review questions for structured feedback
   - Published/unpublished status

8. **media** - Media handling
   - Media upload and management
   - Integration with Cloudflare R2 storage
   - Support for images, videos, documents

9. **messaging** - Real-time messaging
   - WebSocket support via Django Channels
   - Conversation and message models
   - Real-time notifications

10. **notifications** - Push notifications
    - Notification templates
    - User notification settings
    - Multiple delivery channels

11. **rooms** - Video conferencing
    - LiveKit integration for video rooms
    - Room management for sessions
    - Recording capabilities

12. **streams** - Live streaming
    - Stream management
    - Live stream scheduling
    - Stream analytics

13. **community** - Community features
    - Community interaction models
    - Social features

14. **analytics** - Analytics and reporting
    - Analytics models for tracking
    - Reporting endpoints

## API Structure

### Authentication
- JWT-based authentication
- Endpoints:
  - POST `/api/v1/auth/register/` - User registration
  - POST `/api/v1/auth/login/` - User login
  - POST `/api/v1/auth/logout/` - User logout
  - POST `/api/v1/auth/token/refresh/` - Refresh JWT token
  - GET `/api/v1/auth/me/` - Current user profile
  - POST `/api/v1/auth/change-password/` - Change password

### Main API Endpoints (all under `/api/v1/`)

#### Practitioners
- GET/POST `/practitioners/` - List/create practitioners
- GET/PUT/PATCH/DELETE `/practitioners/{id}/` - Practitioner CRUD
- GET `/practitioners/{id}/services/` - Practitioner's services
- GET `/practitioners/{id}/availability/` - Check availability
- POST `/practitioners/{id}/apply/` - Apply to be practitioner

#### Services
- GET/POST `/services/` - List/create services
- GET/PUT/PATCH/DELETE `/services/{id}/` - Service CRUD
- GET `/service-categories/` - Service categories
- GET/POST `/practitioner-categories/` - Practitioner-specific categories
- GET `/packages/` - Service packages
- GET `/bundles/` - Service bundles

#### Bookings
- GET/POST `/bookings/` - List/create bookings
- GET/PUT/PATCH/DELETE `/bookings/{id}/` - Booking CRUD
- POST `/bookings/{id}/confirm/` - Confirm booking
- POST `/bookings/{id}/cancel/` - Cancel booking
- POST `/bookings/{id}/reschedule/` - Reschedule booking
- POST `/bookings/check-availability/` - Check availability

#### Payments
- GET/POST `/payment-methods/` - Payment methods
- GET `/credits/` - User credit balance
- POST `/checkout/` - Create checkout session
- GET `/earnings/balance/` - Practitioner earnings
- POST `/payouts/` - Request payout
- GET `/subscriptions/` - Subscription management

#### Reviews
- GET/POST `/reviews/` - List/create reviews
- GET `/review-questions/` - Review question templates

#### Other Endpoints
- GET `/media/` - Media management
- GET `/notifications/` - User notifications
- GET `/streams/` - Streaming content
- GET `/locations/` - Location data
- GET `/messages/` - Messaging

## Key Features

### 1. Booking System
- Multiple booking types (sessions, workshops, courses)
- Time slot management with practitioner availability
- Automatic conflict detection
- Rescheduling and cancellation workflows
- Parent-child booking relationships for packages

### 2. Payment System
- Stripe integration for payments
- Credit-based system for prepaid purchases
- Practitioner earnings tracking
- Commission management
- Payout processing
- Subscription tiers for practitioners

### 3. Real-time Features
- WebSocket support for messaging
- Live notifications
- Video conferencing via LiveKit
- Live streaming capabilities

### 4. Content Management
- Media uploads to Cloudflare R2
- Service catalog with categories
- Practitioner profiles with rich media

### 5. Search and Discovery
- Service search with filters
- Practitioner discovery
- Location-based search
- Availability-based filtering

## Technical Stack

### Core Dependencies
- Django 5.1.3
- Django REST Framework 3.15.2
- PostgreSQL (via psycopg2-binary)
- Redis for caching/channels
- Celery for async tasks (via Temporal)

### Authentication & Security
- djangorestframework-simplejwt for JWT
- django-cors-headers for CORS
- Custom authentication classes

### API Documentation
- drf-spectacular for OpenAPI/Swagger
- Auto-generated API docs at `/api/v1/docs/`
- ReDoc UI at `/api/v1/docs/redoc/`

### External Integrations
- Stripe for payments
- LiveKit for video conferencing
- Cloudflare R2 for storage
- Temporal for workflow orchestration
- Courier for notifications
- Google Maps for location services

### Additional Libraries
- django-filter for API filtering
- drf-nested-routers for nested resources
- Django Channels for WebSockets
- Pillow for image processing

## API Patterns

### Pagination
- Standard pagination with page size of 20
- Response format:
```json
{
  "count": 100,
  "next": "http://api/endpoint?page=2",
  "previous": null,
  "results": [...]
}
```

### Filtering
- Query parameter-based filtering
- Search fields on most endpoints
- Ordering support

### Error Handling
- Consistent error response format
- Custom exception handler
- Detailed validation errors

### Permissions
- Role-based permissions (User, Practitioner, Admin)
- Object-level permissions
- Custom permission classes

## Database Schema Highlights

### User System
- Custom User model with UUID
- Separate profile models for extended data
- Practitioner as OneToOne with User

### Booking Flow
- Service → Booking → Payment
- Credit system for prepaid purchases
- Earnings tracking for practitioners

### Hierarchical Data
- Parent-child bookings for packages
- Service categories and subcategories
- Location hierarchy (Country → State → City)

## Workflow Integration
- Temporal workflow engine integration
- Async processing for:
  - Booking lifecycle
  - Payment processing
  - Notification delivery
  - Payout processing

## Security Features
- JWT authentication with refresh tokens
- Token blacklisting on logout
- CORS configuration
- Rate limiting (100/hour anon, 1000/hour auth)
- Secure payment handling via Stripe

## Development Features
- DEBUG mode with detailed errors
- Swagger UI for API exploration
- Management commands for:
  - Data seeding
  - Stripe webhook testing
  - Worker management
  - Location data import

## API Versioning
- URL-based versioning (/api/v1/)
- Backward compatibility considerations
- Clear deprecation policies

## Next Steps for Frontend Integration
1. Use JWT authentication flow
2. Implement proper error handling for API responses
3. Utilize pagination for list views
4. Implement real-time features with WebSockets
5. Handle file uploads for media
6. Integrate Stripe for payment flows