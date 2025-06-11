# Bookings API v1

This API provides comprehensive booking management functionality for the Estuary marketplace.

## Features

### Core Functionality
- **CRUD Operations**: Create, read, update, and delete bookings
- **Multiple Booking Types**: Support for individual sessions, workshops, courses, packages, and bundles
- **Status Management**: Comprehensive booking lifecycle management
- **Availability Checking**: Real-time practitioner availability checks
- **Permissions**: Role-based access control for clients and practitioners

### Booking Types Supported
1. **Individual Sessions**: One-on-one appointments with practitioners
2. **Workshops**: Group sessions with multiple participants
3. **Courses**: Multi-session programs with predefined schedules
4. **Packages**: Bundled services sold together
5. **Bundles**: Credit-based packages for future bookings

## API Endpoints

### Base URL
```
/api/v1/drf/bookings/
```

### Main Endpoints

#### List Bookings
```
GET /api/v1/drf/bookings/
```
- Returns bookings based on user role
- Clients see their own bookings
- Practitioners see their appointments and personal bookings
- Supports filtering, searching, and pagination

#### Create Booking
```
POST /api/v1/drf/bookings/
```
Required fields:
- `practitioner_id`: ID of the practitioner
- `service_id`: ID of the service
- `start_time`: Booking start time
- `end_time`: Booking end time

Optional fields:
- `location_id`: Location for in-person services
- `service_session_id`: For workshop/course sessions
- `title`: Custom booking title
- `description`: Booking description
- `client_notes`: Notes from the client

#### Get Booking Details
```
GET /api/v1/drf/bookings/{id}/
```
Returns comprehensive booking information including:
- Service and practitioner details
- Location and room information
- Pricing breakdown
- Status information
- Related bookings (for packages)

#### Update Booking
```
PATCH /api/v1/drf/bookings/{id}/
```
Updateable fields:
- `title`
- `description`
- `client_notes`
- `location_id`
- `meeting_url`
- `meeting_id`
- `timezone`

#### Cancel Booking
```
DELETE /api/v1/drf/bookings/{id}/
```
Or use the dedicated cancel endpoint:
```
POST /api/v1/drf/bookings/{id}/cancel/
```
With optional body:
```json
{
    "reason": "Cancellation reason",
    "canceled_by": "client|practitioner|system|admin"
}
```

### Custom Actions

#### Confirm Booking
```
POST /api/v1/drf/bookings/{id}/confirm/
```
Confirms a booking after payment processing.

#### Complete Booking
```
POST /api/v1/drf/bookings/{id}/complete/
```
Marks a booking as completed (practitioner only).

#### Mark No-Show
```
POST /api/v1/drf/bookings/{id}/no-show/
```
Marks a booking as no-show (practitioner only).

#### Reschedule Booking
```
POST /api/v1/drf/bookings/{id}/reschedule/
```
Body:
```json
{
    "start_time": "2024-03-15T10:00:00Z",
    "end_time": "2024-03-15T11:00:00Z",
    "reason": "Optional reason"
}
```

#### Manage Notes
Get notes:
```
GET /api/v1/drf/bookings/{id}/notes/
```

Add note:
```
POST /api/v1/drf/bookings/{id}/notes/
```
Body:
```json
{
    "content": "Note content",
    "is_private": false
}
```

#### Check Availability
```
POST /api/v1/drf/bookings/check-availability/
```
Body:
```json
{
    "practitioner_id": 1,
    "service_id": 2,
    "date": "2024-03-15",
    "timezone": "America/New_York"
}
```

#### Create Special Booking Types

Package booking:
```
POST /api/v1/drf/bookings/create-package/
```

Bundle booking:
```
POST /api/v1/drf/bookings/create-bundle/
```

Course booking:
```
POST /api/v1/drf/bookings/create-course/
```

All require:
```json
{
    "service_id": 123
}
```

## Filtering and Search

### Query Parameters

- `status`: Filter by booking status (multiple values supported)
- `payment_status`: Filter by payment status
- `practitioner_id`: Filter by practitioner
- `service_id`: Filter by service
- `start_date`: Filter bookings starting from this date
- `end_date`: Filter bookings ending before this date
- `booking_type`: Filter by type (individual, group, package, course, bundle)
- `is_upcoming`: Show only upcoming bookings
- `search`: Search in title, description, service name, practitioner name
- `ordering`: Sort results (start_time, -start_time, created_at, -created_at, price_charged_cents, -price_charged_cents)

### Example Request
```
GET /api/v1/drf/bookings/?status=confirmed&is_upcoming=true&ordering=-start_time
```

## Booking Status Flow

### Status Values
- `draft`: Initial creation, not yet submitted
- `pending_payment`: Awaiting payment
- `confirmed`: Payment received, booking confirmed
- `in_progress`: Service currently happening
- `completed`: Service finished successfully
- `canceled`: Booking was canceled
- `no_show`: Client didn't attend

### Valid Transitions
- draft → pending_payment, canceled
- pending_payment → confirmed, canceled
- confirmed → in_progress, canceled, no_show
- in_progress → completed, no_show
- completed, canceled, no_show → (terminal states)

## Response Formats

### Booking List Response
```json
{
    "count": 100,
    "next": "http://api.example.com/bookings/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "public_uuid": "abc123",
            "practitioner": {...},
            "service": {...},
            "start_time": "2024-03-15T10:00:00Z",
            "end_time": "2024-03-15T11:00:00Z",
            "status": "confirmed",
            "price_charged": "50.00",
            "is_upcoming": true
        }
    ]
}
```

### Booking Detail Response
```json
{
    "id": 1,
    "public_uuid": "abc123",
    "practitioner": {
        "id": 1,
        "name": "Dr. Smith",
        "email": "dr.smith@example.com"
    },
    "service": {
        "id": 2,
        "name": "60-minute Consultation",
        "duration_minutes": 60,
        "price_cents": 5000
    },
    "start_time": "2024-03-15T10:00:00Z",
    "end_time": "2024-03-15T11:00:00Z",
    "status": "confirmed",
    "payment_status": "paid",
    "price_charged": "50.00",
    "can_be_canceled": true,
    "can_be_rescheduled": true,
    "child_bookings": [],
    "notes": []
}
```

## Error Handling

### Common Error Responses

400 Bad Request:
```json
{
    "detail": "Validation error message"
}
```

403 Forbidden:
```json
{
    "detail": "You do not have permission to perform this action"
}
```

404 Not Found:
```json
{
    "detail": "Not found"
}
```

409 Conflict:
```json
{
    "detail": "Time slot not available"
}
```

## Authentication

All endpoints require authentication using Django's session authentication or token authentication.

Include the authentication header:
```
Authorization: Token your-auth-token
```

Or use session cookies if using web-based authentication.