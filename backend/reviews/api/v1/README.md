# Reviews API Documentation

## Overview

The Reviews API provides endpoints for managing customer reviews and ratings for practitioners and services in the Estuary marketplace. It supports review creation, practitioner responses, voting, reporting, and comprehensive filtering.

## Base URL

```
/api/v1/drf/reviews/
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Endpoints

### 1. List Reviews

**GET** `/api/v1/drf/reviews/`

Get a paginated list of published reviews with optional filtering.

#### Query Parameters

- `practitioner` (UUID): Filter by practitioner UUID
- `service` (UUID): Filter by service UUID
- `user` (UUID): Filter by user UUID
- `min_rating` (decimal): Minimum rating (1-5)
- `max_rating` (decimal): Maximum rating (1-5)
- `is_verified` (boolean): Filter verified reviews only
- `is_anonymous` (boolean): Filter anonymous reviews
- `has_response` (boolean): Filter reviews with practitioner responses
- `created_after` (datetime): Reviews created after this date
- `created_before` (datetime): Reviews created before this date
- `search` (string): Search in review comments and user names
- `ordering` (string): Sort by field (e.g., `-created_at`, `rating`, `-helpful_votes`)
- `limit` (integer): Number of results per page (default: 20)
- `offset` (integer): Number of results to skip

#### Response

```json
{
  "count": 150,
  "next": "http://api.example.com/reviews/?offset=20",
  "previous": null,
  "results": [
    {
      "public_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "rating": "4.50",
      "comment": "Great experience with the therapist!",
      "practitioner_name": "Dr. Jane Smith",
      "service_name": "Therapy Session",
      "display_name": "John D.",
      "user_avatar_url": "https://example.com/avatar.jpg",
      "is_anonymous": false,
      "is_verified": true,
      "helpful_votes": 12,
      "unhelpful_votes": 2,
      "created_at": "2024-01-15T10:30:00Z",
      "has_response": true
    }
  ]
}
```

### 2. Create Review

**POST** `/api/v1/drf/reviews/`

Create a new review for a completed booking.

#### Request Body

```json
{
  "booking_uuid": "123e4567-e89b-12d3-a456-426614174000",
  "rating": "5.0",
  "comment": "Excellent service! The practitioner was very professional.",
  "is_anonymous": false,
  "answers": [
    {
      "question_id": 1,
      "rating_answer": 5
    },
    {
      "question_id": 2,
      "text_answer": "Very comfortable environment"
    }
  ]
}
```

#### Alternative Request (without booking)

```json
{
  "practitioner_uuid": "123e4567-e89b-12d3-a456-426614174000",
  "service_uuid": "456e7890-e89b-12d3-a456-426614174000",
  "rating": "4.5",
  "comment": "Good experience overall"
}
```

#### Response

```json
{
  "public_uuid": "789e0123-e89b-12d3-a456-426614174000",
  "rating": "5.00",
  "comment": "Excellent service! The practitioner was very professional.",
  "created_at": "2024-01-20T14:30:00Z"
}
```

### 3. Get Review Details

**GET** `/api/v1/drf/reviews/{public_uuid}/`

Get detailed information about a specific review.

#### Response

```json
{
  "public_uuid": "123e4567-e89b-12d3-a456-426614174000",
  "rating": "4.50",
  "comment": "Great experience!",
  "practitioner_name": "Dr. Jane Smith",
  "service_name": "Therapy Session",
  "display_name": "John D.",
  "user_avatar_url": "https://example.com/avatar.jpg",
  "is_anonymous": false,
  "is_verified": true,
  "helpful_votes": 12,
  "unhelpful_votes": 2,
  "has_response": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "response_text": "Thank you for your kind words!",
  "response_date": "2024-01-16T09:00:00Z",
  "practitioner": {
    "public_uuid": "456e7890-e89b-12d3-a456-426614174000",
    "display_name": "Dr. Jane Smith",
    "professional_title": "Licensed Therapist",
    "profile_image_url": "https://example.com/practitioner.jpg"
  },
  "service": {
    "public_uuid": "789e0123-e89b-12d3-a456-426614174000",
    "name": "Therapy Session",
    "description": "60-minute therapy session"
  },
  "booking": {
    "public_uuid": "012e3456-e89b-12d3-a456-426614174000",
    "start_time": "2024-01-14T14:00:00Z",
    "end_time": "2024-01-14T15:00:00Z"
  },
  "answers": [
    {
      "id": 1,
      "question": {
        "id": 1,
        "question": "How was your overall experience?",
        "question_type": "rating"
      },
      "rating_answer": 5
    }
  ],
  "user_vote": {
    "is_helpful": true
  },
  "net_helpful_votes": 10
}
```

### 4. Update Review

**PATCH** `/api/v1/drf/reviews/{public_uuid}/`

Update your own review (within 24 hours of creation).

#### Request Body

```json
{
  "comment": "Updated comment with more details",
  "is_anonymous": true
}
```

### 5. Delete Review

**DELETE** `/api/v1/drf/reviews/{public_uuid}/`

Delete your own review (within 24 hours of creation).

### 6. Practitioner Response

**POST** `/api/v1/drf/reviews/{public_uuid}/respond/`

Add a practitioner response to a review (practitioners only).

#### Request Body

```json
{
  "response_text": "Thank you for your feedback! We're glad you had a positive experience."
}
```

### 7. Vote on Review

**POST** `/api/v1/drf/reviews/{public_uuid}/vote/`

Vote a review as helpful or unhelpful.

#### Request Body

```json
{
  "is_helpful": true
}
```

### 8. Remove Vote

**DELETE** `/api/v1/drf/reviews/{public_uuid}/unvote/`

Remove your vote from a review.

### 9. Report Review

**POST** `/api/v1/drf/reviews/{public_uuid}/report/`

Report a review for moderation.

#### Request Body

```json
{
  "reason": "inappropriate",
  "details": "Contains offensive language"
}
```

#### Reason Options
- `inappropriate`: Inappropriate content
- `spam`: Spam content
- `off_topic`: Off topic
- `fake`: Fake review
- `harassment`: Harassment
- `other`: Other reason

### 10. Review Statistics

**GET** `/api/v1/drf/reviews/statistics/`

Get aggregated statistics for reviews.

#### Query Parameters

- `practitioner` (UUID): Get stats for specific practitioner (required if service not provided)
- `service` (UUID): Get stats for specific service (required if practitioner not provided)

#### Response

```json
{
  "total_reviews": 150,
  "average_rating": "4.35",
  "rating_distribution": {
    "5": 75,
    "4": 45,
    "3": 20,
    "2": 7,
    "1": 3
  },
  "verified_reviews": 120,
  "total_helpful_votes": 450,
  "reviews_last_30_days": 25,
  "reviews_last_90_days": 65,
  "service_ratings": [
    {
      "service_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "service_name": "Therapy Session",
      "average_rating": "4.50",
      "total_reviews": 80
    }
  ]
}
```

### 11. My Reviews

**GET** `/api/v1/drf/reviews/my_reviews/`

Get all reviews written by the authenticated user.

### 12. Can Review Check

**GET** `/api/v1/drf/reviews/can_review/`

Check if the authenticated user can review a practitioner or service.

#### Query Parameters

- `practitioner` (UUID): Practitioner to check
- `service` (UUID): Service to check

#### Response

```json
{
  "can_review": true,
  "booking_uuid": "123e4567-e89b-12d3-a456-426614174000"
}
```

or

```json
{
  "can_review": false,
  "reason": "No completed bookings without reviews"
}
```

### 13. Review Questions

**GET** `/api/v1/drf/reviews/review-questions/`

Get active review questions for structured reviews.

#### Query Parameters

- `applies_to` (string): Filter by `service`, `practitioner`, or get all

#### Response

```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "public_uuid": "123e4567-e89b-12d3-a456-426614174000",
      "question": "How was your overall experience?",
      "description": "Rate your overall satisfaction",
      "is_required": true,
      "question_type": "rating",
      "order": 1,
      "applies_to": "both"
    }
  ]
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Review already exists for this booking"
}
```

### 403 Forbidden

```json
{
  "error": "Only practitioners can respond to reviews"
}
```

### 404 Not Found

```json
{
  "error": "Review not found"
}
```

## Permissions

- **List/Read**: Public access
- **Create**: Authenticated users with completed bookings
- **Update/Delete**: Review owner within 24 hours
- **Respond**: Practitioner who received the review
- **Vote/Report**: Authenticated users (not review owner)

## Best Practices

1. **Review Creation**: Always check if user can review before showing review form
2. **Filtering**: Use practitioner/service filters for performance when displaying reviews on profile pages
3. **Caching**: Review statistics can be cached for better performance
4. **Moderation**: Implement automated flagging for reviews with low ratings or specific keywords
5. **Response Time**: Encourage practitioners to respond to reviews within 48 hours