# Services API Documentation

## Overview

The Services API provides comprehensive endpoints for managing the service catalog in the marketplace. It supports various service types including sessions, workshops, courses, packages, and bundles.

## Endpoints

### Service Categories

- `GET /api/v1/services/categories/` - List all active categories
- `GET /api/v1/services/categories/{slug}/` - Get category details
- `GET /api/v1/services/categories/featured/` - Get featured categories
- `POST /api/v1/services/categories/` - Create category (admin only)
- `PUT /api/v1/services/categories/{slug}/` - Update category (admin only)
- `DELETE /api/v1/services/categories/{slug}/` - Delete category (admin only)

### Practitioner Categories

- `GET /api/v1/services/practitioner-categories/` - List practitioner's categories
- `POST /api/v1/services/practitioner-categories/` - Create custom category
- `PUT /api/v1/services/practitioner-categories/{id}/` - Update category
- `DELETE /api/v1/services/practitioner-categories/{id}/` - Delete category
- `POST /api/v1/services/practitioner-categories/reorder/` - Reorder categories

### Services

- `GET /api/v1/services/services/` - List services with filters
- `GET /api/v1/services/services/{id}/` - Get service details
- `POST /api/v1/services/services/` - Create service (practitioners only)
- `PUT /api/v1/services/services/{id}/` - Update service
- `DELETE /api/v1/services/services/{id}/` - Delete service
- `GET /api/v1/services/services/featured/` - Get featured services
- `GET /api/v1/services/services/popular/` - Get popular services
- `GET /api/v1/services/services/search/` - Advanced search
- `POST /api/v1/services/services/{id}/duplicate/` - Duplicate service
- `GET /api/v1/services/services/{id}/media/` - Get media attachments
- `GET /api/v1/services/services/{id}/resources/` - Get resources
- `GET /api/v1/services/services/{id}/waitlist/` - Get waitlist
- `POST /api/v1/services/services/{id}/waitlist/` - Join waitlist

### Packages & Bundles

- `GET /api/v1/services/packages/` - List all packages
- `GET /api/v1/services/bundles/` - List all bundles

### Service Sessions

- `GET /api/v1/services/sessions/?service_id={id}` - List sessions for a service
- `POST /api/v1/services/sessions/` - Create session
- `PUT /api/v1/services/sessions/{id}/` - Update session
- `DELETE /api/v1/services/sessions/{id}/` - Delete session

### Resources

- `GET /api/v1/services/resources/` - List resources with filters
- `POST /api/v1/services/resources/` - Upload resource
- `PUT /api/v1/services/resources/{id}/` - Update resource
- `DELETE /api/v1/services/resources/{id}/` - Delete resource

## Filtering

The service listing endpoint supports extensive filtering:

```
GET /api/v1/services/services/?category=yoga&min_price=50&max_price=200&location_type=virtual
```

### Available Filters

- `category` - Category slug
- `category_id` - Category ID
- `service_type` - Service type code (session, workshop, course, package, bundle)
- `practitioner` - Practitioner ID
- `practitioner_slug` - Practitioner slug
- `min_price` - Minimum price in dollars
- `max_price` - Maximum price in dollars
- `min_duration` - Minimum duration in minutes
- `max_duration` - Maximum duration in minutes
- `location_type` - virtual, in_person, or hybrid
- `experience_level` - beginner, intermediate, advanced, all_levels
- `is_featured` - Boolean
- `is_active` - Boolean
- `is_public` - Boolean
- `status` - draft, published, paused, discontinued
- `available_now` - Boolean, filters currently available services

## Search

Advanced search with multiple parameters:

```
GET /api/v1/services/services/search/?q=meditation&category=wellness&min_price=25&sort_by=rating
```

### Search Parameters

- `q` - Search query (searches name, description, tags)
- `sort_by` - Sort options: created_at, -created_at, price, -price, rating, -rating, popularity
- `page` - Page number (default: 1)
- `page_size` - Results per page (default: 20, max: 100)

## Creating Services

### Basic Service (Session)

```json
POST /api/v1/services/services/
{
    "name": "60-Minute Yoga Session",
    "description": "Relaxing yoga session for all levels",
    "service_type_id": 1,
    "price": 75.00,
    "duration_minutes": 60,
    "category_id": 1,
    "max_participants": 1,
    "location_type": "virtual"
}
```

### Package with Child Services

```json
POST /api/v1/services/services/
{
    "name": "5-Session Yoga Package",
    "service_type_id": 4,
    "price": 350.00,
    "validity_days": 90,
    "child_service_configs": [
        {
            "child_service_id": 123,
            "quantity": 5,
            "discount_percentage": 10
        }
    ]
}
```

### Bundle

```json
POST /api/v1/services/services/
{
    "name": "10-Session Bundle - Save 20%",
    "service_type_id": 5,
    "price": 600.00,
    "sessions_included": 10,
    "bonus_sessions": 2,
    "validity_days": 180,
    "highlight_text": "BEST VALUE"
}
```

## Media Attachments

Media is managed through the Media API but can be associated with services:

```json
POST /api/v1/media/upload/
{
    "entity_type": "service",
    "entity_id": "service-uuid",
    "file": <file>,
    "is_primary": true,
    "display_order": 0
}
```

## Permissions

- **Public Access**: Browse categories, view public services
- **Authenticated Users**: Join waitlists, view registered resources
- **Practitioners**: Create/edit their own services, manage resources
- **Service Owners**: Full control over their services
- **Admins**: Manage global categories and featured services

## Response Format

All list endpoints return paginated responses:

```json
{
    "count": 150,
    "page": 1,
    "page_size": 20,
    "total_pages": 8,
    "results": [...]
}
```

Service detail responses include comprehensive information:

```json
{
    "id": 123,
    "public_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Advanced Meditation Workshop",
    "price": "125.00",
    "price_cents": 12500,
    "category": {
        "id": 1,
        "name": "Wellness",
        "slug": "wellness"
    },
    "primary_practitioner": {
        "id": 45,
        "display_name": "Jane Smith",
        "slug": "jane-smith"
    },
    "average_rating": 4.8,
    "total_reviews": 24,
    "media_attachments": [...],
    "sessions": [...],
    "resources": [...]
}
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

Error responses include details:

```json
{
    "error": "Validation failed",
    "details": {
        "price": ["Ensure this value is greater than or equal to 0."]
    }
}
```