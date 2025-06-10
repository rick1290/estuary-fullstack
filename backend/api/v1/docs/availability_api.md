# Availability Management API Documentation

## Overview

The Availability Management API provides comprehensive functionality for practitioners to manage their schedules, availability, and time slots. This API supports recurring schedules, exceptions (vacations/holidays), real-time availability checking, and integration with the booking system.

## Base URL

```
/api/v1/practitioners/availability
```

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Schedule Management

#### List Schedules
```http
GET /schedules
```

Query Parameters:
- `is_active` (boolean, optional): Filter by active status
- `skip` (integer, default: 0): Number of records to skip
- `limit` (integer, default: 100, max: 100): Number of records to return

Response:
```json
{
  "success": true,
  "schedules": [
    {
      "id": "uuid",
      "name": "Summer Schedule",
      "description": "Extended hours for summer",
      "timezone": "America/New_York",
      "is_default": false,
      "is_active": true,
      "time_slots": [
        {
          "id": "uuid",
          "day": 0,
          "day_name": "Monday",
          "start_time": "09:00:00",
          "end_time": "17:00:00",
          "is_active": true,
          "created_at": "2024-01-01T00:00:00Z",
          "updated_at": "2024-01-01T00:00:00Z"
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Create Schedule
```http
POST /schedules
```

Request Body:
```json
{
  "name": "Weekday Schedule",
  "description": "Standard business hours",
  "timezone": "America/New_York",
  "is_default": true,
  "is_active": true,
  "time_slots": [
    {
      "day": 0,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_active": true
    }
  ]
}
```

#### Update Schedule
```http
PATCH /schedules/{schedule_id}
```

Request Body (partial update supported):
```json
{
  "name": "Updated Schedule Name",
  "is_default": true
}
```

#### Delete Schedule
```http
DELETE /schedules/{schedule_id}
```

Note: Cannot delete the last active schedule.

#### Bulk Create/Update Schedules
```http
POST /schedules/bulk
```

Request Body:
```json
{
  "schedules": [
    {
      "name": "Schedule 1",
      "timezone": "America/New_York",
      "time_slots": [...]
    }
  ],
  "replace_existing": false
}
```

### 2. Time Slot Management

#### Add Time Slot to Schedule
```http
POST /schedules/{schedule_id}/time-slots
```

Request Body:
```json
{
  "day": 3,
  "start_time": "13:00:00",
  "end_time": "17:00:00",
  "is_active": true
}
```

#### Update Time Slot
```http
PATCH /schedules/{schedule_id}/time-slots/{slot_id}
```

#### Delete Time Slot
```http
DELETE /schedules/{schedule_id}/time-slots/{slot_id}
```

### 3. Availability Checking

#### Get Available Time Slots
```http
GET /slots
```

Query Parameters:
- `service_id` (string, required): Service to check availability for
- `start_date` (date, optional): Start date for availability check
- `end_date` (date, optional): End date for availability check
- `days_ahead` (integer, default: 30): Number of days to check ahead
- `timezone` (string, default: "UTC"): Timezone for response times
- `include_buffer` (boolean, default: true): Include buffer time in calculations
- `group_by_date` (boolean, default: false): Group results by date

Response (grouped by date):
```json
{
  "success": true,
  "dates": [
    {
      "date": "2024-01-15",
      "day_name": "Monday",
      "slots": [
        {
          "start_datetime": "2024-01-15T09:00:00-05:00",
          "end_datetime": "2024-01-15T10:00:00-05:00",
          "date": "2024-01-15",
          "day": 0,
          "day_name": "Monday",
          "start_time": "09:00:00",
          "end_time": "10:00:00",
          "is_available": true,
          "service_id": "service-uuid",
          "schedule_id": "schedule-uuid",
          "schedule_name": "Weekday Schedule",
          "timezone": "America/New_York"
        }
      ],
      "total_slots": 8
    }
  ],
  "total_dates": 14,
  "total_slots": 112,
  "timezone": "America/New_York",
  "start_date": "2024-01-15",
  "end_date": "2024-01-28"
}
```

#### Check Specific Time Availability
```http
POST /check
```

Request Body:
```json
{
  "service_id": "service-uuid",
  "start_datetime": "2024-01-15T14:00:00Z",
  "end_datetime": "2024-01-15T15:00:00Z",
  "timezone": "America/New_York"
}
```

Response:
```json
{
  "success": true,
  "is_available": false,
  "reason": "Time conflicts with existing bookings",
  "conflicts": [
    {
      "booking_id": "booking-uuid",
      "start_time": "2024-01-15T13:30:00Z",
      "end_time": "2024-01-15T14:30:00Z",
      "service_name": "Massage Therapy"
    }
  ],
  "suggested_times": [
    {
      "start_datetime": "2024-01-15T15:00:00-05:00",
      "end_datetime": "2024-01-15T16:00:00-05:00",
      "date": "2024-01-15",
      "start_time": "15:00:00",
      "end_time": "16:00:00"
    }
  ]
}
```

### 4. Exception Management

#### Add Availability Exception
```http
POST /exceptions
```

Request Body:
```json
{
  "exception_type": "vacation",
  "start_date": "2024-07-01",
  "end_date": "2024-07-14",
  "reason": "Summer vacation",
  "is_recurring": false,
  "affects_all_services": true,
  "affected_service_ids": []
}
```

Exception Types:
- `vacation`: Vacation period
- `holiday`: Holiday
- `personal`: Personal time off
- `training`: Training/conference
- `other`: Other reason

#### List Exceptions
```http
GET /exceptions
```

Query Parameters:
- `start_date` (date, optional): Filter exceptions starting from this date
- `end_date` (date, optional): Filter exceptions ending before this date
- `is_archived` (boolean, default: false): Include archived exceptions
- `skip` (integer, default: 0): Number of records to skip
- `limit` (integer, default: 100): Number of records to return

#### Remove Exception
```http
DELETE /exceptions/{exception_id}
```

Note: This archives the exception rather than deleting it.

### 5. Working Hours Configuration

#### Set Default Working Hours
```http
POST /working-hours
```

Request Body:
```json
{
  "timezone": "America/New_York",
  "monday": {"start": "09:00:00", "end": "17:00:00"},
  "tuesday": {"start": "09:00:00", "end": "17:00:00"},
  "wednesday": {"start": "09:00:00", "end": "17:00:00"},
  "thursday": {"start": "09:00:00", "end": "19:00:00"},
  "friday": {"start": "09:00:00", "end": "15:00:00"},
  "saturday": null,
  "sunday": null,
  "buffer_time_minutes": 15,
  "advance_booking_hours": 24,
  "advance_booking_days": 30
}
```

Setting a day to `null` indicates the practitioner is not available that day.

## Data Models

### Schedule
- Represents a named schedule template (e.g., "Summer Hours", "Winter Schedule")
- Can have multiple time slots for different days
- One schedule can be marked as default
- Supports timezone configuration

### TimeSlot
- Represents availability on a specific day of the week
- Part of a schedule
- Includes start and end times
- Can be individually activated/deactivated

### AvailabilityException
- Represents periods when the practitioner is unavailable
- Can be full-day or partial-day exceptions
- Supports different exception types
- Can affect all services or specific services

## Business Rules

1. **Schedule Management**:
   - At least one active schedule must exist
   - Only one schedule can be marked as default
   - Time slots within a schedule cannot overlap

2. **Availability Calculation**:
   - Considers practitioner's schedules and time slots
   - Applies buffer time between appointments
   - Respects advance booking limits
   - Excludes periods covered by exceptions
   - Checks for conflicts with existing bookings

3. **Time Zones**:
   - All times are stored in UTC
   - Schedules can have their own timezone settings
   - API responses include timezone information
   - Clients should handle timezone conversions appropriately

4. **Buffer Times**:
   - Buffer time is added after each appointment
   - Prevents back-to-back bookings
   - Configurable per practitioner

5. **Booking Windows**:
   - Minimum advance booking time (e.g., 24 hours)
   - Maximum advance booking period (e.g., 30 days)
   - Configurable per practitioner

## Integration with Booking System

The availability API integrates seamlessly with the booking system:

1. **Real-time Availability**: The booking flow uses `/slots` to show available times
2. **Conflict Prevention**: `/check` endpoint validates time availability before booking
3. **Exception Handling**: Bookings respect practitioner exceptions
4. **Service-Specific**: Availability can be checked for specific services

## Error Handling

Common error responses:

```json
{
  "detail": "Schedule not found",
  "status_code": 404
}
```

```json
{
  "detail": "Time slot overlaps with existing slot",
  "status_code": 400
}
```

```json
{
  "detail": "Cannot delete the last active schedule",
  "status_code": 400
}
```

## Best Practices

1. **Schedule Setup**:
   - Create a default schedule with typical working hours
   - Add specific schedules for seasonal changes
   - Use descriptive names for schedules

2. **Exception Management**:
   - Add exceptions well in advance
   - Use appropriate exception types
   - Include descriptive reasons

3. **Time Zone Handling**:
   - Always specify timezone in requests
   - Store practitioner's primary timezone
   - Display times in user's local timezone

4. **Performance**:
   - Cache frequently accessed schedules
   - Limit date ranges when checking availability
   - Use pagination for list endpoints

## Example Workflows

### Initial Setup
1. Set default working hours using `/working-hours`
2. This automatically creates a default schedule
3. Add any exceptions for upcoming holidays/vacations

### Seasonal Schedule Change
1. Create a new schedule with `/schedules`
2. Add appropriate time slots
3. Mark as default when ready to activate
4. Previous default schedule remains available

### Vacation Planning
1. Add exception using `/exceptions`
2. Specify date range and reason
3. System automatically blocks bookings during this period
4. Clients attempting to book see alternative suggestions