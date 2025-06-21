# API Endpoints Inventory

This document provides a complete inventory of all implemented API endpoints in the Django backend.

## Base URL
All API endpoints are prefixed with: `/api/v1/`

## Authentication Endpoints
- `POST /api/v1/auth/register/` - User registration
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/logout/` - User logout
- `POST /api/v1/auth/logout/simple/` - Simple logout
- `POST /api/v1/auth/token/refresh/` - Refresh JWT token
- `GET /api/v1/auth/me/` - Get current user profile
- `POST /api/v1/auth/change-password/` - Change password

## Booking Endpoints
### Standard CRUD
- `GET /api/v1/bookings/` - List bookings (filtered by user role)
- `POST /api/v1/bookings/` - Create a new booking
- `GET /api/v1/bookings/{id}/` - Get booking details
- `PATCH /api/v1/bookings/{id}/` - Update booking details
- `DELETE /api/v1/bookings/{id}/` - Cancel booking

### Custom Actions
- `POST /api/v1/bookings/{id}/confirm/` - Confirm booking (after payment)
- `POST /api/v1/bookings/{id}/cancel/` - Cancel booking with reason
- `POST /api/v1/bookings/{id}/complete/` - Mark booking as completed (practitioner only)
- `POST /api/v1/bookings/{id}/no-show/` - Mark as no-show (practitioner only)
- `POST /api/v1/bookings/{id}/reschedule/` - Reschedule booking
- `GET /api/v1/bookings/{id}/notes/` - Get booking notes
- `POST /api/v1/bookings/{id}/notes/` - Add note to booking
- `POST /api/v1/bookings/check-availability/` - Check practitioner availability
- `POST /api/v1/bookings/create-package/` - Create package booking
- `POST /api/v1/bookings/create-bundle/` - Create bundle booking
- `POST /api/v1/bookings/create-course/` - Create course booking

## Service Endpoints
### Service Categories
- `GET /api/v1/service-categories/` - List all service categories
- `POST /api/v1/service-categories/` - Create new category
- `GET /api/v1/service-categories/{id}/` - Get category details
- `PATCH /api/v1/service-categories/{id}/` - Update category
- `DELETE /api/v1/service-categories/{id}/` - Delete category

### Practitioner Categories
- `GET /api/v1/practitioner-categories/` - List practitioner service categories
- `POST /api/v1/practitioner-categories/` - Create practitioner category
- `GET /api/v1/practitioner-categories/{id}/` - Get practitioner category
- `PATCH /api/v1/practitioner-categories/{id}/` - Update practitioner category
- `DELETE /api/v1/practitioner-categories/{id}/` - Delete practitioner category

### Services
- `GET /api/v1/services/` - List all services
- `POST /api/v1/services/` - Create new service
- `GET /api/v1/services/{id}/` - Get service details
- `PATCH /api/v1/services/{id}/` - Update service
- `DELETE /api/v1/services/{id}/` - Delete service

### Packages
- `GET /api/v1/packages/` - List all packages
- `POST /api/v1/packages/` - Create new package
- `GET /api/v1/packages/{id}/` - Get package details
- `PATCH /api/v1/packages/{id}/` - Update package
- `DELETE /api/v1/packages/{id}/` - Delete package

### Bundles
- `GET /api/v1/bundles/` - List all bundles
- `POST /api/v1/bundles/` - Create new bundle
- `GET /api/v1/bundles/{id}/` - Get bundle details
- `PATCH /api/v1/bundles/{id}/` - Update bundle
- `DELETE /api/v1/bundles/{id}/` - Delete bundle

### Service Sessions
- `GET /api/v1/service-sessions/` - List service sessions
- `POST /api/v1/service-sessions/` - Create service session
- `GET /api/v1/service-sessions/{id}/` - Get session details
- `PATCH /api/v1/service-sessions/{id}/` - Update session
- `DELETE /api/v1/service-sessions/{id}/` - Delete session

### Service Resources
- `GET /api/v1/service-resources/` - List service resources
- `POST /api/v1/service-resources/` - Create service resource
- `GET /api/v1/service-resources/{id}/` - Get resource details
- `PATCH /api/v1/service-resources/{id}/` - Update resource
- `DELETE /api/v1/service-resources/{id}/` - Delete resource

## Practitioner Endpoints
### Standard CRUD
- `GET /api/v1/practitioners/` - List practitioners (public)
- `POST /api/v1/practitioners/` - Create practitioner profile
- `GET /api/v1/practitioners/{id}/` - Get practitioner details (public)
- `PATCH /api/v1/practitioners/{id}/` - Update practitioner profile
- `DELETE /api/v1/practitioners/{id}/` - Delete practitioner profile

### Custom Actions
- `GET /api/v1/practitioners/my-profile/` - Get authenticated practitioner's profile
- `POST /api/v1/practitioners/apply/` - Apply to become a practitioner
- `POST /api/v1/practitioners/{id}/verify-email/` - Verify practitioner email
- `POST /api/v1/practitioners/{id}/upload-document/` - Upload verification document
- `GET /api/v1/practitioners/{id}/services/` - Get practitioner's services
- `GET /api/v1/practitioners/{id}/availability/` - Get practitioner availability
- `GET /api/v1/practitioners/{id}/stats/` - Get practitioner statistics
- `POST /api/v1/practitioners/search/` - Search practitioners

### Schedules
- `GET /api/v1/schedules/` - List schedules
- `POST /api/v1/schedules/` - Create schedule
- `GET /api/v1/schedules/{id}/` - Get schedule details
- `PATCH /api/v1/schedules/{id}/` - Update schedule
- `DELETE /api/v1/schedules/{id}/` - Delete schedule

### Availability
- `GET /api/v1/availability/` - List availability slots
- `POST /api/v1/availability/` - Create availability
- `GET /api/v1/availability/{id}/` - Get availability details
- `PATCH /api/v1/availability/{id}/` - Update availability
- `DELETE /api/v1/availability/{id}/` - Delete availability

### Certifications
- `GET /api/v1/certifications/` - List certifications
- `POST /api/v1/certifications/` - Create certification
- `GET /api/v1/certifications/{id}/` - Get certification details
- `PATCH /api/v1/certifications/{id}/` - Update certification
- `DELETE /api/v1/certifications/{id}/` - Delete certification

### Education
- `GET /api/v1/education/` - List education records
- `POST /api/v1/education/` - Create education record
- `GET /api/v1/education/{id}/` - Get education details
- `PATCH /api/v1/education/{id}/` - Update education
- `DELETE /api/v1/education/{id}/` - Delete education

### Practitioner Applications
- `GET /api/v1/practitioner-applications/` - List applications
- `POST /api/v1/practitioner-applications/` - Create application
- `GET /api/v1/practitioner-applications/{id}/` - Get application details
- `PATCH /api/v1/practitioner-applications/{id}/` - Update application
- `DELETE /api/v1/practitioner-applications/{id}/` - Delete application

## Payment Endpoints
### Payment Methods
- `GET /api/v1/payment-methods/` - List payment methods
- `POST /api/v1/payment-methods/` - Add payment method
- `GET /api/v1/payment-methods/{id}/` - Get payment method details
- `PATCH /api/v1/payment-methods/{id}/` - Update payment method
- `DELETE /api/v1/payment-methods/{id}/` - Delete payment method

### Payments
- `GET /api/v1/payments/` - List payments
- `POST /api/v1/payments/` - Create payment
- `GET /api/v1/payments/{id}/` - Get payment details
- `PATCH /api/v1/payments/{id}/` - Update payment
- `DELETE /api/v1/payments/{id}/` - Delete payment

### Checkout
- `GET /api/v1/checkout/` - List checkout sessions
- `POST /api/v1/checkout/` - Create checkout session
- `GET /api/v1/checkout/{id}/` - Get checkout details
- `PATCH /api/v1/checkout/{id}/` - Update checkout
- `DELETE /api/v1/checkout/{id}/` - Delete checkout

### Credits
- `GET /api/v1/credits/` - List credits
- `POST /api/v1/credits/` - Create credit
- `GET /api/v1/credits/{id}/` - Get credit details
- `PATCH /api/v1/credits/{id}/` - Update credit
- `DELETE /api/v1/credits/{id}/` - Delete credit

### Payouts
- `GET /api/v1/payouts/` - List payouts
- `POST /api/v1/payouts/` - Create payout
- `GET /api/v1/payouts/{id}/` - Get payout details
- `PATCH /api/v1/payouts/{id}/` - Update payout
- `DELETE /api/v1/payouts/{id}/` - Delete payout

### Subscriptions
- `GET /api/v1/subscriptions/` - List subscriptions
- `POST /api/v1/subscriptions/` - Create subscription
- `GET /api/v1/subscriptions/{id}/` - Get subscription details
- `PATCH /api/v1/subscriptions/{id}/` - Update subscription
- `DELETE /api/v1/subscriptions/{id}/` - Delete subscription

### Commissions
- `GET /api/v1/commissions/` - List commissions
- `POST /api/v1/commissions/` - Create commission
- `GET /api/v1/commissions/{id}/` - Get commission details
- `PATCH /api/v1/commissions/{id}/` - Update commission
- `DELETE /api/v1/commissions/{id}/` - Delete commission

## Review Endpoints
### Reviews
- `GET /api/v1/reviews/` - List reviews
- `POST /api/v1/reviews/` - Create review
- `GET /api/v1/reviews/{id}/` - Get review details
- `PATCH /api/v1/reviews/{id}/` - Update review
- `DELETE /api/v1/reviews/{id}/` - Delete review

### Review Questions
- `GET /api/v1/review-questions/` - List review questions
- `POST /api/v1/review-questions/` - Create review question
- `GET /api/v1/review-questions/{id}/` - Get question details
- `PATCH /api/v1/review-questions/{id}/` - Update question
- `DELETE /api/v1/review-questions/{id}/` - Delete question

## Location Endpoints
### Countries
- `GET /api/v1/countries/` - List countries
- `POST /api/v1/countries/` - Create country
- `GET /api/v1/countries/{id}/` - Get country details
- `PATCH /api/v1/countries/{id}/` - Update country
- `DELETE /api/v1/countries/{id}/` - Delete country

### States
- `GET /api/v1/states/` - List states
- `POST /api/v1/states/` - Create state
- `GET /api/v1/states/{id}/` - Get state details
- `PATCH /api/v1/states/{id}/` - Update state
- `DELETE /api/v1/states/{id}/` - Delete state

### Cities
- `GET /api/v1/cities/` - List cities
- `POST /api/v1/cities/` - Create city
- `GET /api/v1/cities/{id}/` - Get city details
- `PATCH /api/v1/cities/{id}/` - Update city
- `DELETE /api/v1/cities/{id}/` - Delete city

### Zip Codes
- `GET /api/v1/zipcodes/` - List zip codes
- `POST /api/v1/zipcodes/` - Create zip code
- `GET /api/v1/zipcodes/{id}/` - Get zip code details
- `PATCH /api/v1/zipcodes/{id}/` - Update zip code
- `DELETE /api/v1/zipcodes/{id}/` - Delete zip code

### Practitioner Locations
- `GET /api/v1/practitioner-locations/` - List practitioner locations
- `POST /api/v1/practitioner-locations/` - Create practitioner location
- `GET /api/v1/practitioner-locations/{id}/` - Get location details
- `PATCH /api/v1/practitioner-locations/{id}/` - Update location
- `DELETE /api/v1/practitioner-locations/{id}/` - Delete location

## Media Endpoints
- `GET /api/v1/media/` - List media files
- `POST /api/v1/media/` - Upload media file
- `GET /api/v1/media/{id}/` - Get media details
- `PATCH /api/v1/media/{id}/` - Update media metadata
- `DELETE /api/v1/media/{id}/` - Delete media file

## Notification Endpoints
### Notifications
- `GET /api/v1/notifications/` - List notifications
- `POST /api/v1/notifications/` - Create notification
- `GET /api/v1/notifications/{id}/` - Get notification details
- `PATCH /api/v1/notifications/{id}/` - Update notification
- `DELETE /api/v1/notifications/{id}/` - Delete notification

### Notification Settings
- `GET /api/v1/notification-settings/` - List notification settings
- `POST /api/v1/notification-settings/` - Create notification setting
- `GET /api/v1/notification-settings/{id}/` - Get setting details
- `PATCH /api/v1/notification-settings/{id}/` - Update setting
- `DELETE /api/v1/notification-settings/{id}/` - Delete setting

### Notification Templates
- `GET /api/v1/notification-templates/` - List templates
- `POST /api/v1/notification-templates/` - Create template
- `GET /api/v1/notification-templates/{id}/` - Get template details
- `PATCH /api/v1/notification-templates/{id}/` - Update template
- `DELETE /api/v1/notification-templates/{id}/` - Delete template

## Stream Endpoints
### Streams
- `GET /api/v1/streams/` - List streams
- `POST /api/v1/streams/` - Create stream
- `GET /api/v1/streams/{id}/` - Get stream details
- `PATCH /api/v1/streams/{id}/` - Update stream
- `DELETE /api/v1/streams/{id}/` - Delete stream

### Live Streams
- `GET /api/v1/live-streams/` - List live streams
- `POST /api/v1/live-streams/` - Create live stream
- `GET /api/v1/live-streams/{id}/` - Get live stream details
- `PATCH /api/v1/live-streams/{id}/` - Update live stream
- `DELETE /api/v1/live-streams/{id}/` - Delete live stream

### Stream Schedules
- `GET /api/v1/stream-schedules/` - List stream schedules
- `POST /api/v1/stream-schedules/` - Create stream schedule
- `GET /api/v1/stream-schedules/{id}/` - Get schedule details
- `PATCH /api/v1/stream-schedules/{id}/` - Update schedule
- `DELETE /api/v1/stream-schedules/{id}/` - Delete schedule

### Stream Categories
- `GET /api/v1/stream-categories/` - List stream categories
- `POST /api/v1/stream-categories/` - Create stream category
- `GET /api/v1/stream-categories/{id}/` - Get category details
- `PATCH /api/v1/stream-categories/{id}/` - Update category
- `DELETE /api/v1/stream-categories/{id}/` - Delete category

## Documentation Endpoints
- `GET /api/v1/schema/` - OpenAPI schema
- `GET /api/v1/docs/` - Swagger UI documentation
- `GET /api/v1/docs/redoc/` - ReDoc documentation
- `GET /api/v1/health/` - Health check endpoint
- `GET /api/v1/info/` - API information
- `GET /api/v1/resources/` - Available resources documentation
- `GET /api/v1/examples/` - API usage examples
- `GET /api/v1/errors/` - Error code documentation

## Query Parameters
Most list endpoints support the following query parameters:
- `page` - Page number for pagination
- `page_size` - Number of items per page
- `search` - Search text
- `ordering` - Field to order by (prefix with `-` for descending)
- Various filters specific to each endpoint

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Public endpoints that don't require authentication:
- Authentication endpoints (login, register)
- Public practitioner listing and details
- Service categories and services listing
- Documentation endpoints