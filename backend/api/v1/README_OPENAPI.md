# Estuary API OpenAPI Documentation

## Overview

The Estuary API uses drf-spectacular to generate comprehensive OpenAPI 3.0 documentation. This documentation is automatically generated from the Django REST Framework views and serializers.

## Accessing the Documentation

The API documentation is available at the following endpoints:

- **Swagger UI**: `/api/v1/drf/docs/` - Interactive API documentation with a user-friendly interface
- **ReDoc**: `/api/v1/drf/docs/redoc/` - Alternative documentation UI with a clean, three-panel design
- **OpenAPI Schema**: `/api/v1/drf/docs/schema/` - Raw OpenAPI 3.0 schema in JSON format
- **Schema Download**: `/api/v1/drf/docs/schema/download/` - Download the OpenAPI schema file

## Additional Documentation Endpoints

- **API Health Check**: `/api/v1/drf/health/` - Check API status
- **API Info**: `/api/v1/drf/info/` - General API information
- **API Resources**: `/api/v1/drf/resources/` - List of available resources
- **API Examples**: `/api/v1/drf/examples/` - Example requests and responses
- **Error Codes**: `/api/v1/drf/errors/` - Complete error code documentation

## Features

### 1. Authentication

All endpoints (except public ones) require JWT authentication. The documentation UI includes:
- Authentication button to add your JWT token
- Persistent authentication across page reloads
- Clear indication of which endpoints require authentication

### 2. Request/Response Examples

Each endpoint includes:
- Example request bodies with all required and optional fields
- Multiple response examples showing different scenarios
- Error response examples with proper error codes

### 3. API Organization

Endpoints are organized by tags:
- **Auth**: Authentication and authorization
- **Users**: User profile management
- **Practitioners**: Practitioner profiles and services
- **Services**: Service catalog
- **Bookings**: Booking management
- **Payments**: Payment processing
- **Reviews**: Reviews and ratings
- And more...

### 4. Interactive Testing

Using Swagger UI, you can:
- Test endpoints directly from the browser
- See real-time responses
- Download response data
- Copy curl commands

## Schema Customization

### Adding Documentation to Views

Use drf-spectacular decorators to enhance your views:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    summary='Create a booking',
    description='Create a new booking for a service',
    parameters=[
        OpenApiParameter(
            name='use_credits',
            type=bool,
            location=OpenApiParameter.QUERY,
            description='Whether to use available credits'
        ),
    ],
    examples=[
        OpenApiExample(
            'Session booking',
            value={
                'service_id': 1,
                'start_time': '2024-01-15T10:00:00Z'
            }
        )
    ],
    tags=['Bookings']
)
def create(self, request):
    pass
```

### Custom Schema Extensions

The schema includes custom extensions for:
- Common error responses (401, 403, 404, etc.)
- Pagination parameters
- Search and filtering parameters
- Standard response formats

See `api/v1/schema.py` and `api/v1/schema_extensions.py` for implementation details.

## Validating the Schema

Run the validation command to ensure the schema is properly generated:

```bash
python manage.py validate_openapi_schema
```

To save the schema to a file:

```bash
python manage.py validate_openapi_schema --save --output openapi.json
```

## Configuration

The OpenAPI schema is configured in `settings.py` under `SPECTACULAR_SETTINGS`. Key settings include:

- **TITLE**: API title
- **DESCRIPTION**: Detailed API description with markdown support
- **VERSION**: API version
- **TAGS**: List of tags for organizing endpoints
- **SECURITY**: Authentication configuration
- **SWAGGER_UI_SETTINGS**: Swagger UI customization
- **REDOC_UI_SETTINGS**: ReDoc UI customization

## Best Practices

1. **Always add operation IDs**: Use meaningful operation IDs for better client generation
2. **Include examples**: Add request/response examples for clarity
3. **Document errors**: Include all possible error responses
4. **Use tags**: Properly tag endpoints for organization
5. **Add descriptions**: Write clear descriptions for endpoints and parameters

## Integration with Frontend

The OpenAPI schema can be used to:
- Generate TypeScript types
- Create API client libraries
- Validate API contracts
- Generate API documentation

## Troubleshooting

### Schema not updating
- Restart the Django development server
- Clear browser cache
- Run `python manage.py validate_openapi_schema` to check for errors

### Missing endpoints
- Ensure views are properly registered in urlpatterns
- Check that views have appropriate decorators
- Verify authentication classes are set correctly

### Authentication issues
- Make sure to include the Bearer token in the Swagger UI
- Check token expiration
- Verify CORS settings for frontend access