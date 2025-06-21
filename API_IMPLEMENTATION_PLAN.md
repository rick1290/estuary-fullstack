# API Implementation Plan

Based on the analysis of frontend requirements and backend capabilities, here's a prioritized implementation plan.

## Phase 1: Critical Missing APIs (Week 1-2)

These APIs are essential for core functionality that the frontend expects:

### 1.1 Time Slot Management
```python
# apps/bookings/views.py
class ServiceTimeSlotViewSet(viewsets.ViewSet):
    """
    GET /api/v1/services/{id}/time-slots/?date=2024-01-15
    Returns available time slots for a service on a given date
    """
    
# apps/practitioners/views.py  
class PractitionerScheduleBlockView(APIView):
    """
    POST /api/v1/practitioner/schedule/block/
    Block specific time slots
    """
```

### 1.2 Favorites System
```python
# apps/users/models.py
class UserFavorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'content_type', 'object_id']

# apps/users/views.py
class UserFavoritesViewSet(viewsets.ModelViewSet):
    """Handles user favorites for practitioners and services"""
```

### 1.3 Enhanced Search
```python
# apps/search/views.py
class SearchView(APIView):
    """
    GET /api/v1/search/?q=yoga&type=all|service|practitioner|stream
    Unified search across all content types
    """
    
class SearchSuggestionsView(APIView):
    """
    GET /api/v1/search/suggestions/?q=med
    Returns autocomplete suggestions
    """
```

### 1.4 Notifications
```python
# apps/notifications/models.py
class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

# apps/notifications/views.py
class NotificationViewSet(viewsets.ModelViewSet):
    """Full CRUD for notifications with unread count"""
```

## Phase 2: Service Enhancements (Week 3-4)

### 2.1 Service Filtering Enhancement
```python
# apps/services/filters.py
class ServiceFilter(django_filters.FilterSet):
    service_type = django_filters.ChoiceFilter(choices=SERVICE_TYPE_CHOICES)
    format = django_filters.ChoiceFilter(choices=['online', 'in-person'])
    price_min = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    distance = django_filters.NumberFilter(method='filter_by_distance')
    
    def filter_by_distance(self, queryset, name, value):
        lat = self.request.query_params.get('latitude')
        lng = self.request.query_params.get('longitude')
        if lat and lng:
            # Implement distance filtering using PostGIS or haversine
            pass
        return queryset
```

### 2.2 Stream Content Interactions
```python
# apps/streams/views.py
class StreamInteractionView(APIView):
    """
    POST/DELETE /api/v1/streams/{id}/like/
    POST/DELETE /api/v1/streams/{id}/save/
    """
    
class StreamUnlockView(APIView):
    """
    POST /api/v1/streams/{id}/unlock/
    Unlock premium content using credits or payment
    """
```

### 2.3 Bundle/Package Integration
```python
# Update existing views to include related bundles/packages
class ServiceViewSet(viewsets.ModelViewSet):
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Add related packages and bundles
        data['packages'] = PackageSerializer(
            instance.packages.filter(is_active=True), 
            many=True
        ).data
        data['bundles'] = BundleSerializer(
            instance.bundles.filter(is_active=True), 
            many=True
        ).data
        
        return Response(data)
```

## Phase 3: Analytics & Reporting (Week 5-6)

### 3.1 Practitioner Analytics
```python
# apps/analytics/views.py
class PractitionerAnalyticsView(APIView):
    permission_classes = [IsPractitioner]
    
    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """
        GET /api/v1/practitioner/analytics/revenue/
        Revenue breakdown by service type, time period
        """
        
    @action(detail=False, methods=['get'])
    def clients(self, request):
        """
        GET /api/v1/practitioner/analytics/clients/
        Client demographics and retention
        """
        
    @action(detail=False, methods=['get'])
    def booking_trends(self, request):
        """
        GET /api/v1/practitioner/analytics/bookings/trends/
        Booking patterns and popular times
        """
```

### 3.2 Review System Enhancement
```python
# apps/reviews/views.py
class BookingReviewView(APIView):
    """
    POST /api/v1/bookings/{id}/review/
    Create review after booking completion
    """
    
class ReviewReplyView(APIView):
    """
    POST /api/v1/reviews/{id}/reply/
    Practitioner reply to reviews
    """
```

## Implementation Guidelines

### 1. API Consistency
All new endpoints should follow this response format:
```json
{
    "status": "success|error",
    "data": {},
    "message": "Human readable message",
    "errors": {},
    "meta": {
        "pagination": {},
        "filters_applied": {}
    }
}
```

### 2. Permission Classes
Create consistent permission classes:
```python
# apps/core/permissions.py
class IsOwnerOrReadOnly(permissions.BasePermission):
    """Object-level permission to only allow owners to edit"""
    
class IsPractitionerOwner(permissions.BasePermission):
    """Ensure practitioner owns the resource"""
    
class HasActiveBooking(permissions.BasePermission):
    """User has active booking for the service"""
```

### 3. Serializer Patterns
Use nested serializers for related data:
```python
class ServiceDetailSerializer(serializers.ModelSerializer):
    practitioner = PractitionerBriefSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    upcoming_sessions = SerializerMethodField()
    reviews_summary = SerializerMethodField()
    
    class Meta:
        model = Service
        fields = '__all__'
```

### 4. Testing Strategy
For each new endpoint, create:
```python
# tests/test_endpoint_name.py
class EndpointTestCase(APITestCase):
    def setUp(self):
        # Create test data
        
    def test_list_permissions(self):
        # Test authentication and permissions
        
    def test_filtering(self):
        # Test all filter parameters
        
    def test_pagination(self):
        # Test pagination works correctly
        
    def test_edge_cases(self):
        # Test error handling
```

### 5. Documentation
Update OpenAPI schema for each endpoint:
```python
from drf_spectacular.utils import extend_schema, OpenApiParameter

@extend_schema(
    summary="Get available time slots",
    description="Returns available time slots for a service on a given date",
    parameters=[
        OpenApiParameter(
            name='date',
            description='Date to check availability (YYYY-MM-DD)',
            required=True,
            type=str,
        ),
    ],
    responses={
        200: TimeSlotSerializer(many=True),
        404: {"description": "Service not found"},
    }
)
```

## Migration Strategy

### 1. Database Migrations
```bash
# Create migrations for new models
python manage.py makemigrations

# Review migrations before applying
python manage.py sqlmigrate app_name migration_number

# Apply migrations
python manage.py migrate
```

### 2. Data Migration
For existing data that needs transformation:
```python
# apps/migrations/0xxx_populate_favorites.py
from django.db import migrations

def populate_favorites_from_likes(apps, schema_editor):
    # Migration logic to transform existing data
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('app_name', '0xxx_previous'),
    ]
    
    operations = [
        migrations.RunPython(populate_favorites_from_likes),
    ]
```

### 3. Backward Compatibility
- Keep deprecated endpoints for 2 release cycles
- Add deprecation warnings in responses
- Document migration path in API docs

## Monitoring & Performance

### 1. Add Logging
```python
import logging
logger = logging.getLogger(__name__)

class ServiceViewSet(viewsets.ModelViewSet):
    def list(self, request, *args, **kwargs):
        logger.info(f"Service list accessed by user {request.user.id}")
        # ... rest of the code
```

### 2. Performance Optimization
```python
# Use select_related and prefetch_related
queryset = Service.objects.select_related(
    'practitioner', 
    'category'
).prefetch_related(
    'reviews',
    'bookings'
)

# Add database indexes
class Meta:
    indexes = [
        models.Index(fields=['practitioner', 'service_type']),
        models.Index(fields=['created_at', 'is_active']),
    ]
```

### 3. Caching Strategy
```python
from django.core.cache import cache

def get_practitioner_stats(practitioner_id):
    cache_key = f"practitioner_stats_{practitioner_id}"
    stats = cache.get(cache_key)
    
    if stats is None:
        stats = calculate_practitioner_stats(practitioner_id)
        cache.set(cache_key, stats, timeout=300)  # 5 minutes
        
    return stats
```

## Deployment Checklist

Before deploying each phase:
- [ ] All tests passing
- [ ] API documentation updated
- [ ] Database migrations tested
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Frontend integration tested
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared