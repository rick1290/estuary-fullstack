# DRF Migration Task List

## Overview
Complete migration from FastAPI to Django REST Framework, organizing APIs within each Django app.

## Phase 1: Foundation & Setup (Priority: Critical)

### 1.1 Base Configuration
- [ ] Install and configure djangorestframework-simplejwt for JWT auth
- [ ] Create base serializers (BaseModelSerializer, TimestampedModelSerializer)
- [ ] Create base viewsets (BaseViewSet with common permissions)
- [ ] Configure DRF settings (pagination, filtering, permissions)
- [ ] Set up drf-spectacular for OpenAPI documentation

### 1.2 Authentication System
- [ ] Create auth app with DRF views (login, register, refresh, logout)
- [ ] Migrate JWT token generation to match existing FastAPI format
- [ ] Create custom authentication classes
- [ ] Add social auth endpoints (Google, Apple, Facebook)
- [ ] Create password reset endpoints

### 1.3 Common Infrastructure
- [ ] Create custom pagination classes
- [ ] Create custom permission classes (IsOwner, IsPractitioner, etc.)
- [ ] Create exception handlers matching FastAPI format
- [ ] Set up API versioning structure
- [ ] Create custom filters and search backends

## Phase 2: Core Business Logic Apps (Priority: High)

### 2.1 Bookings API (`bookings/api/v1/`)
- [ ] Create BookingSerializer with nested relationships
- [ ] Create BookingViewSet with custom actions
- [ ] Add availability checking endpoint
- [ ] Add booking confirmation/cancellation endpoints
- [ ] Add booking history and filtering
- [ ] Create webhook endpoints for booking events
- [ ] Add credit payment integration

### 2.2 Services API (`services/api/v1/`)
- [ ] Create Service serializers (Service, Package, Bundle)
- [ ] Create ServiceViewSet with filtering by type
- [ ] Add practitioner service management endpoints
- [ ] Create ServiceSession viewset for workshops/courses
- [ ] Add service discovery endpoints
- [ ] Create category management endpoints
- [ ] Add service pricing and availability

### 2.3 Practitioners API (`practitioners/api/v1/`)
- [ ] Create Practitioner profile serializers
- [ ] Create PractitionerViewSet with nested routes
- [ ] Add availability schedule management
- [ ] Create onboarding progress endpoints
- [ ] Add practitioner search and filtering
- [ ] Create practitioner subscription endpoints
- [ ] Add earnings and payout endpoints

### 2.4 Payments API (`payments/api/v1/`)
- [ ] Create payment serializers (Order, Transaction, etc.)
- [ ] Create credit purchase endpoints
- [ ] Add credit balance and history
- [ ] Create earnings tracking endpoints
- [ ] Add payout management endpoints
- [ ] Migrate Stripe webhook handlers
- [ ] Create commission calculation endpoints

## Phase 3: User & Social Features (Priority: Medium)

### 3.1 Users API (`users/api/v1/`)
- [ ] Create user profile serializers
- [ ] Create UserViewSet with profile management
- [ ] Add favorite practitioners endpoints
- [ ] Create user preferences endpoints
- [ ] Add notification settings

### 3.2 Reviews API (`reviews/api/v1/`)
- [ ] Create review serializers
- [ ] Create ReviewViewSet with nested routes
- [ ] Add review questions endpoints
- [ ] Create review analytics endpoints
- [ ] Add moderation endpoints

### 3.3 Community API (`community/api/v1/`)
- [ ] Create post and comment serializers
- [ ] Create community viewsets
- [ ] Add like/reaction endpoints
- [ ] Create following/follower endpoints
- [ ] Add content moderation

### 3.4 Messaging API (`messaging/api/v1/`)
- [ ] Create message serializers
- [ ] Create conversation viewsets
- [ ] Keep WebSocket consumer as-is
- [ ] Add message history endpoints
- [ ] Create notification endpoints

## Phase 4: Discovery & Content (Priority: Medium)

### 4.1 Search API (`search/api/v1/`)
- [ ] Create search serializers
- [ ] Implement service search with filters
- [ ] Add practitioner search
- [ ] Create location-based search
- [ ] Add search suggestions/autocomplete

### 4.2 Locations API (`locations/api/v1/`)
- [ ] Create location serializers
- [ ] Create location viewsets
- [ ] Add geocoding endpoints
- [ ] Create service area endpoints
- [ ] Add popular locations

### 4.3 Media API (`media/api/v1/`)
- [ ] Create media upload serializers
- [ ] Create media management viewsets
- [ ] Add image processing endpoints
- [ ] Create gallery management

### 4.4 Streams API (`streams/api/v1/`)
- [ ] Create stream content serializers
- [ ] Create stream subscription viewsets
- [ ] Add content management endpoints
- [ ] Create monetization endpoints

## Phase 5: Real-time & Integration (Priority: Low)

### 5.1 Rooms API (`rooms/api/v1/`)
- [ ] Create room serializers
- [ ] Create video room management
- [ ] Migrate token generation
- [ ] Keep WebSocket events in Channels

### 5.2 Notifications API (`notifications/api/v1/`)
- [ ] Create notification serializers
- [ ] Create notification preferences
- [ ] Add push notification endpoints
- [ ] Create notification history

### 5.3 Analytics API (`analytics/api/v1/`)
- [ ] Create analytics serializers
- [ ] Create dashboard endpoints
- [ ] Add reporting endpoints
- [ ] Create export functionality

### 5.4 Webhooks & Integrations
- [ ] Migrate Stripe webhooks to DRF
- [ ] Create LiveKit webhooks
- [ ] Add third-party integrations
- [ ] Create webhook logging

## Phase 6: Migration & Cleanup (Priority: Final)

### 6.1 Testing
- [ ] Create DRF API test suite
- [ ] Add integration tests
- [ ] Create performance tests
- [ ] Add security tests

### 6.2 Documentation
- [ ] Generate OpenAPI schema
- [ ] Create API documentation
- [ ] Add code examples
- [ ] Create migration guide

### 6.3 Deployment
- [ ] Update ASGI configuration
- [ ] Remove FastAPI dependencies
- [ ] Update Docker configuration
- [ ] Update nginx configuration

### 6.4 Cleanup
- [ ] Remove FastAPI code
- [ ] Remove old API directory
- [ ] Update requirements.txt
- [ ] Archive old tests

## Implementation Order

1. **Week 1**: Phase 1 (Foundation & Auth)
2. **Week 2-3**: Phase 2.1-2.2 (Bookings & Services)
3. **Week 3-4**: Phase 2.3-2.4 (Practitioners & Payments)
4. **Week 5**: Phase 3 (User & Social)
5. **Week 6**: Phase 4 (Discovery & Content)
6. **Week 7**: Phase 5 (Real-time & Integration)
7. **Week 8**: Phase 6 (Testing & Cleanup)

## Success Criteria

- [ ] All FastAPI endpoints migrated to DRF
- [ ] Tests passing with >90% coverage
- [ ] OpenAPI documentation complete
- [ ] No performance regression
- [ ] WebSocket functionality maintained
- [ ] Backwards compatibility maintained

## Notes

- Each app will have its own `api/v1/` directory
- Use ViewSets for standard CRUD, APIViews for custom logic
- Maintain URL structure for backwards compatibility
- Keep response format consistent during migration
- Use feature flags for gradual rollout