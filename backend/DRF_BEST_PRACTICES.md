# Django REST Framework Best Practices Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [Serializers](#serializers)
3. [Views and ViewSets](#views-and-viewsets)
4. [Authentication & Permissions](#authentication--permissions)
5. [API Design](#api-design)
6. [Error Handling](#error-handling)
7. [Performance](#performance)
8. [Testing](#testing)
9. [Documentation](#documentation)

## Project Structure

### App-Level API Organization
```
app_name/
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── serializers.py      # All serializers for this app
│       ├── views.py           # ViewSets and APIViews
│       ├── urls.py            # URL routing
│       ├── filters.py         # Custom filters
│       ├── permissions.py     # Custom permissions
│       └── pagination.py      # Custom pagination if needed
├── models.py
├── managers.py                # Custom model managers
├── signals.py                 # Django signals
├── tasks.py                   # Async tasks (Celery)
└── tests/
    ├── test_api.py
    ├── test_models.py
    └── test_serializers.py
```

### Core API Infrastructure
```
core/
├── api/
│   ├── __init__.py
│   ├── authentication.py      # Custom auth classes
│   ├── exceptions.py          # Custom exceptions
│   ├── filters.py            # Base filters
│   ├── mixins.py             # Reusable mixins
│   ├── pagination.py         # Base pagination
│   ├── permissions.py        # Base permissions
│   ├── serializers.py        # Base serializers
│   ├── throttling.py         # Rate limiting
│   └── views.py              # Base views/viewsets
```

## Serializers

### Base Serializers
```python
# core/api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class BaseModelSerializer(serializers.ModelSerializer):
    """Base serializer with common functionality"""
    
    class Meta:
        abstract = True
        read_only_fields = ('id', 'created_at', 'updated_at')


class TimestampedSerializer(BaseModelSerializer):
    """Serializer with timestamp fields"""
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class UserSerializer(BaseModelSerializer):
    """Consistent user representation across APIs"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name')
        
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
```

### Serializer Best Practices
```python
# bookings/api/v1/serializers.py
class BookingSerializer(TimestampedSerializer):
    # Use source for field mapping
    customer = UserSerializer(source='user', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    # Use SerializerMethodField for computed values
    total_price = serializers.SerializerMethodField()
    
    # Explicit field validation
    start_datetime = serializers.DateTimeField(
        required=True,
        error_messages={
            'required': 'Booking start time is required',
            'invalid': 'Invalid datetime format. Use ISO 8601'
        }
    )
    
    class Meta:
        model = Booking
        fields = (
            'id', 'customer', 'service', 'service_name',
            'start_datetime', 'end_datetime', 'total_price',
            'status', 'created_at', 'updated_at'
        )
        
    def get_total_price(self, obj):
        return str(obj.final_amount)  # Convert Decimal to string
    
    def validate_start_datetime(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                "Booking must be in the future"
            )
        return value
    
    def validate(self, attrs):
        """Object-level validation"""
        if attrs.get('end_datetime') <= attrs.get('start_datetime'):
            raise serializers.ValidationError({
                'end_datetime': 'Must be after start time'
            })
        return attrs


class BookingCreateSerializer(serializers.ModelSerializer):
    """Separate serializer for creation with different fields"""
    
    class Meta:
        model = Booking
        fields = ('service', 'practitioner', 'start_datetime', 'notes')
        
    def create(self, validated_data):
        # Add request user
        validated_data['user'] = self.context['request'].user
        
        # Calculate end time
        service = validated_data['service']
        validated_data['end_datetime'] = (
            validated_data['start_datetime'] + 
            timedelta(minutes=service.duration_minutes)
        )
        
        return super().create(validated_data)
```

## Views and ViewSets

### Base ViewSets
```python
# core/api/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action

class BaseViewSet(viewsets.ModelViewSet):
    """Base viewset with common functionality"""
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return self.create_serializer_class
        elif self.action == 'update' or self.action == 'partial_update':
            return self.update_serializer_class
        elif self.action == 'list':
            return self.list_serializer_class
        return self.serializer_class
    
    def perform_create(self, serializer):
        """Hook for modifying creation"""
        serializer.save(created_by=self.request.user)
```

### ViewSet Best Practices
```python
# bookings/api/v1/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

class BookingViewSet(BaseViewSet):
    """
    Booking management endpoints
    
    list: Get all bookings (filtered by user role)
    create: Create a new booking
    retrieve: Get booking details
    update: Update booking (full)
    partial_update: Update booking (partial)
    destroy: Cancel booking
    """
    
    queryset = Booking.objects.none()  # Override in get_queryset
    serializer_class = BookingSerializer
    create_serializer_class = BookingCreateSerializer
    list_serializer_class = BookingListSerializer
    
    # Automatic filtering and ordering
    filterset_fields = ['status', 'service', 'practitioner']
    search_fields = ['service__name', 'practitioner__user__first_name']
    ordering_fields = ['start_time', 'created_at']
    ordering = ['-start_time']
    
    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        
        # Prefetch related data to avoid N+1 queries
        queryset = Booking.objects.select_related(
            'user', 'service', 'practitioner__user', 'location'
        ).prefetch_related(
            'service__categories'
        )
        
        if user.is_staff:
            return queryset
        
        # Users see their own bookings
        return queryset.filter(user=user)
    
    @transaction.atomic
    def perform_create(self, serializer):
        """Create booking with transaction"""
        booking = serializer.save()
        
        # Send notifications, update calendars, etc.
        booking.send_confirmation_email()
        
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a booking
        
        POST /api/v1/bookings/{id}/cancel/
        {
            "reason": "Schedule conflict"
        }
        """
        booking = self.get_object()
        
        if not booking.can_be_canceled:
            return Response(
                {'error': 'Booking cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        booking.cancel(reason=reason, cancelled_by=request.user)
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming bookings for current user"""
        queryset = self.get_queryset().filter(
            start_time__gt=timezone.now(),
            status='confirmed'
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

## Authentication & Permissions

### JWT Configuration
```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}
```

### Custom Permissions
```python
# core/api/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission to only allow owners to edit"""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        return obj.user == request.user


class IsPractitioner(permissions.BasePermission):
    """User must be a practitioner"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'practitioner') and
            request.user.practitioner.is_verified
        )


class IsOwnerOrPractitioner(permissions.BasePermission):
    """Either owner or practitioner can access"""
    
    def has_object_permission(self, request, view, obj):
        return (
            obj.user == request.user or
            obj.practitioner.user == request.user
        )
```

## API Design

### URL Patterns
```python
# bookings/api/v1/urls.py
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet

router = DefaultRouter(trailing_slash=False)  # No trailing slash
router.register('bookings', BookingViewSet, basename='booking')

urlpatterns = router.urls

# Results in:
# GET     /api/v1/bookings          - List bookings
# POST    /api/v1/bookings          - Create booking
# GET     /api/v1/bookings/{id}     - Retrieve booking
# PUT     /api/v1/bookings/{id}     - Update booking
# PATCH   /api/v1/bookings/{id}     - Partial update
# DELETE  /api/v1/bookings/{id}     - Delete booking
# POST    /api/v1/bookings/{id}/cancel - Cancel booking
```

### Nested Resources
```python
# services/api/v1/urls.py
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register('practitioners', PractitionerViewSet)

# Nested routes
practitioners_router = routers.NestedDefaultRouter(
    router, 'practitioners', lookup='practitioner'
)
practitioners_router.register(
    'services', PractitionerServicesViewSet,
    basename='practitioner-services'
)

# Results in:
# /api/v1/practitioners/{id}/services/
```

### Response Format
```python
# Consistent response format
{
    "status": "success",
    "data": {...},  # or [...] for lists
    "message": "Booking created successfully"
}

# Error format
{
    "status": "error",
    "errors": {
        "field_name": ["Error message"]
    },
    "message": "Validation failed"
}

# List with pagination
{
    "status": "success",
    "data": {
        "results": [...],
        "count": 100,
        "next": "http://api/v1/bookings?page=2",
        "previous": null
    }
}
```

## Error Handling

### Custom Exception Handler
```python
# core/api/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'status': 'error',
            'message': 'An error occurred',
            'errors': {}
        }
        
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response_data['errors'] = exc.detail
            else:
                custom_response_data['message'] = str(exc.detail)
        
        response.data = custom_response_data
    
    return response


class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = 'Service temporarily unavailable'
    default_code = 'service_unavailable'
```

## Performance

### Query Optimization
```python
# Use select_related for foreign keys
queryset = Booking.objects.select_related(
    'user', 'service', 'practitioner__user'
)

# Use prefetch_related for many-to-many
queryset = Service.objects.prefetch_related(
    'categories', 'practitioners'
)

# Use only() to limit fields
queryset = User.objects.only('id', 'email', 'first_name', 'last_name')

# Use Prefetch for complex queries
from django.db.models import Prefetch

queryset = Practitioner.objects.prefetch_related(
    Prefetch(
        'services',
        queryset=Service.objects.filter(is_active=True),
        to_attr='active_services'
    )
)
```

### Caching
```python
# Method-level caching
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    
    @method_decorator(cache_page(60 * 15))  # 15 minutes
    def list(self, request):
        return super().list(request)
    
    def get_categories(self, service_id):
        cache_key = f'service:{service_id}:categories'
        categories = cache.get(cache_key)
        
        if categories is None:
            categories = list(
                Category.objects.filter(services__id=service_id)
                .values('id', 'name')
            )
            cache.set(cache_key, categories, 60 * 60)  # 1 hour
        
        return categories
```

### Pagination
```python
# core/api/pagination.py
from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'status': 'success',
            'data': {
                'results': data,
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            }
        })
```

## Testing

### API Test Structure
```python
# bookings/tests/test_api.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class BaseAPITestCase(APITestCase):
    """Base test case with authentication helpers"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def authenticate(self, user=None):
        """Add JWT token to client"""
        user = user or self.user
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
    
    def create_practitioner(self, user=None):
        """Helper to create practitioner"""
        user = user or User.objects.create_user(
            email='practitioner@example.com',
            password='testpass123'
        )
        return Practitioner.objects.create(
            user=user,
            is_verified=True
        )


class BookingAPITestCase(BaseAPITestCase):
    """Test booking endpoints"""
    
    def setUp(self):
        super().setUp()
        self.practitioner = self.create_practitioner()
        self.service = Service.objects.create(
            name='Test Service',
            practitioner=self.practitioner,
            duration_minutes=60,
            price_cents=10000
        )
    
    def test_create_booking(self):
        """Test booking creation"""
        self.authenticate()
        
        data = {
            'service': self.service.id,
            'practitioner': self.practitioner.id,
            'start_datetime': '2025-07-01T10:00:00Z',
            'notes': 'Test booking'
        }
        
        response = self.client.post('/api/v1/bookings', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(
            response.data['data']['service'], 
            self.service.id
        )
    
    def test_list_bookings_filtered(self):
        """Test that users only see their own bookings"""
        # Create bookings for different users
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        Booking.objects.create(
            user=self.user,
            service=self.service,
            practitioner=self.practitioner,
            start_time=timezone.now() + timedelta(days=1),
            end_time=timezone.now() + timedelta(days=1, hours=1)
        )
        
        Booking.objects.create(
            user=other_user,
            service=self.service,
            practitioner=self.practitioner,
            start_time=timezone.now() + timedelta(days=2),
            end_time=timezone.now() + timedelta(days=2, hours=1)
        )
        
        self.authenticate()
        response = self.client.get('/api/v1/bookings')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['results']), 1)
```

## Documentation

### drf-spectacular Configuration
```python
# settings.py
SPECTACULAR_SETTINGS = {
    'TITLE': 'Estuary API',
    'DESCRIPTION': 'Wellness marketplace API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    
    # Authentication
    'SECURITY': [{
        'bearerAuth': {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    }],
    
    # Better type hints
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    
    # Organize by tags
    'TAGS': [
        {'name': 'Auth', 'description': 'Authentication operations'},
        {'name': 'Bookings', 'description': 'Booking management'},
        {'name': 'Services', 'description': 'Service catalog'},
    ],
}
```

### ViewSet Documentation
```python
from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter
)

@extend_schema_view(
    list=extend_schema(
        summary='List bookings',
        description='Get paginated list of bookings',
        parameters=[
            OpenApiParameter(
                name='status',
                enum=['pending', 'confirmed', 'cancelled'],
                description='Filter by status'
            ),
        ],
        tags=['Bookings']
    ),
    create=extend_schema(
        summary='Create booking',
        description='Create a new booking',
        request=BookingCreateSerializer,
        responses={201: BookingSerializer},
        tags=['Bookings']
    )
)
class BookingViewSet(viewsets.ModelViewSet):
    pass
```

## Security Best Practices

### Settings
```python
# API Security settings
REST_FRAMEWORK = {
    # Authentication
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    
    # Permissions
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    
    # Throttling
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    
    # Versioning
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    
    # Parser limits
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    
    # Renderer
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "https://example.com",
    "https://app.example.com",
]

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

### Input Validation
```python
# Always validate input
class ServiceSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        max_length=255,
        validators=[
            RegexValidator(
                regex='^[a-zA-Z0-9 ]+$',
                message='Name can only contain letters, numbers, and spaces'
            )
        ]
    )
    
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
        max_value=10000
    )
```

## Common Patterns

### Soft Delete
```python
class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    
    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.is_deleted = True
        instance.save()
    
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)
```

### Audit Trail
```python
class AuditMixin:
    """Track who created/updated records"""
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
```

### Bulk Operations
```python
class BulkCreateMixin:
    """Support bulk creation"""
    
    def create(self, request, *args, **kwargs):
        many = isinstance(request.data, list)
        
        if many:
            serializer = self.get_serializer(data=request.data, many=True)
        else:
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
```

This guide provides a comprehensive foundation for DRF development with production-ready patterns and best practices.