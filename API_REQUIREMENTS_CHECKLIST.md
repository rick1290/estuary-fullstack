# API Requirements Checklist: Frontend-Backend Alignment

This checklist maps all frontend requirements to backend API endpoints, identifying what exists and what needs to be built.

## ✅ Completed APIs

### Authentication & User Management
- [x] User registration - `POST /api/v1/auth/register/`
- [x] User login - `POST /api/v1/auth/login/`
- [x] Token refresh - `POST /api/v1/auth/token/refresh/`
- [x] Get current user - `GET /api/v1/auth/user/`
- [x] Update user profile - `PUT /api/v1/auth/user/`
- [x] Password reset - `POST /api/v1/auth/password/reset/`

### Practitioner Management
- [x] List practitioners - `GET /api/v1/practitioners/`
- [x] Get practitioner details - `GET /api/v1/practitioners/{id}/`
- [x] Get practitioner services - `GET /api/v1/practitioners/{id}/services/`
- [x] Get practitioner availability - `GET /api/v1/practitioners/{id}/availability/`
- [x] Get practitioner reviews - `GET /api/v1/practitioners/{id}/reviews/`
- [x] Apply to become practitioner - `POST /api/v1/practitioners/apply/`

### Service Management
- [x] List services - `GET /api/v1/services/`
- [x] Get service details - `GET /api/v1/services/{id}/`
- [x] Create service (practitioner) - `POST /api/v1/services/`
- [x] Update service (practitioner) - `PUT /api/v1/services/{id}/`
- [x] Delete service (practitioner) - `DELETE /api/v1/services/{id}/`
- [x] Get service categories - `GET /api/v1/services/categories/`

### Booking System
- [x] Create booking - `POST /api/v1/bookings/`
- [x] Get booking details - `GET /api/v1/bookings/{id}/`
- [x] List user bookings - `GET /api/v1/bookings/`
- [x] Cancel booking - `POST /api/v1/bookings/{id}/cancel/`
- [x] Get upcoming bookings - `GET /api/v1/bookings/upcoming/`

### Payment System
- [x] Create payment intent - `POST /api/v1/payments/create-intent/`
- [x] Confirm payment - `POST /api/v1/payments/confirm/`
- [x] Get payment history - `GET /api/v1/payments/history/`
- [x] Get credit balance - `GET /api/v1/credits/balance/`

### Messaging
- [x] List conversations - `GET /api/v1/conversations/`
- [x] Get messages - `GET /api/v1/conversations/{id}/messages/`
- [x] Send message - `POST /api/v1/conversations/{id}/messages/`

## 🔧 APIs Needing Enhancement

### Service Discovery & Filtering
**Frontend Needs:**
- Filter by service type (session/workshop/course)
- Filter by format (in-person/online)
- Filter by price range
- Filter by location/distance
- Sort by various criteria

**Current State:** Basic filtering exists
**Required Enhancements:**
```
GET /api/v1/services/?
  service_type=session
  &format=online|in-person
  &price_min=50
  &price_max=200
  &latitude=40.7128
  &longitude=-74.0060
  &distance=25
  &sort_by=price|rating|distance
```

### Practitioner Dashboard Analytics
**Frontend Shows:**
- Revenue by service type
- Client demographics
- Booking trends
- Popular time slots

**Missing Endpoints:**
```
GET /api/v1/practitioner/analytics/revenue/
  ?group_by=service_type|month|week
  &date_from=2024-01-01
  &date_to=2024-12-31

GET /api/v1/practitioner/analytics/clients/
GET /api/v1/practitioner/analytics/bookings/trends/
GET /api/v1/practitioner/analytics/popular-slots/
```

### Service Bundling & Packages
**Frontend Needs:**
- Display packages on service pages
- Show bundle savings
- Purchase bundles/packages

**Missing Endpoints:**
```
GET /api/v1/services/{id}/packages/
GET /api/v1/services/{id}/bundles/
POST /api/v1/bookings/bundle/
```

## ❌ Missing APIs

### 1. Stream Content Management
**Frontend Features:**
- Like/unlike content
- Save/unsave content
- Comment on streams
- Filter by content type
- Premium content access

**Required APIs:**
```
POST   /api/v1/streams/{id}/like/
DELETE /api/v1/streams/{id}/like/
POST   /api/v1/streams/{id}/save/
DELETE /api/v1/streams/{id}/save/
GET    /api/v1/streams/?content_type=video|article|audio
POST   /api/v1/streams/{id}/unlock/ (for premium content)
```

### 2. Favorites & Saved Items
**Frontend Features:**
- Save/unsave practitioners
- Save/unsave services
- View saved items list

**Required APIs:**
```
POST   /api/v1/users/favorites/practitioners/
DELETE /api/v1/users/favorites/practitioners/{id}/
GET    /api/v1/users/favorites/practitioners/
POST   /api/v1/users/favorites/services/
DELETE /api/v1/users/favorites/services/{id}/
GET    /api/v1/users/favorites/services/
```

### 3. Search & Recommendations
**Frontend Features:**
- Global search
- Search suggestions
- Personalized recommendations

**Required APIs:**
```
GET /api/v1/search/?q=yoga&type=all|service|practitioner|stream
GET /api/v1/search/suggestions/?q=med
GET /api/v1/recommendations/services/
GET /api/v1/recommendations/practitioners/
```

### 4. Notifications
**Frontend Features:**
- Notification bell with count
- List notifications
- Mark as read

**Required APIs:**
```
GET    /api/v1/notifications/
GET    /api/v1/notifications/unread-count/
PUT    /api/v1/notifications/{id}/read/
PUT    /api/v1/notifications/read-all/
DELETE /api/v1/notifications/{id}/
```

### 5. Time Slot Management
**Frontend Features:**
- Get available time slots for sessions
- Block/unblock time slots (practitioner)
- Recurring availability patterns

**Required APIs:**
```
GET  /api/v1/services/{id}/time-slots/?date=2024-01-15
POST /api/v1/practitioner/schedule/block/
POST /api/v1/practitioner/schedule/recurring/
```

### 6. Review System Enhancements
**Frontend Features:**
- Leave reviews after service completion
- Reply to reviews (practitioner)
- Review statistics

**Required APIs:**
```
POST /api/v1/bookings/{id}/review/
POST /api/v1/reviews/{id}/reply/
GET  /api/v1/practitioners/{id}/review-stats/
```

### 7. Practitioner Onboarding Flow
**Frontend Features:**
- Multi-step onboarding
- Document upload
- Verification status tracking

**Required APIs:**
```
GET  /api/v1/practitioner/onboarding/status/
POST /api/v1/practitioner/onboarding/step/{step}/
POST /api/v1/practitioner/documents/upload/
GET  /api/v1/practitioner/verification-status/
```

### 8. Promotional Features
**Frontend Features:**
- Apply promo codes
- View active promotions
- Practitioner promotional tools

**Required APIs:**
```
POST /api/v1/promo-codes/validate/
POST /api/v1/promo-codes/apply/
GET  /api/v1/promotions/active/
POST /api/v1/practitioner/promotions/create/
```

## 🔄 Real-time Requirements

### WebSocket Connections Needed
1. **Chat/Messaging** - ✅ Exists: `/ws/chat/{conversation_id}/`
2. **Notifications** - ✅ Exists: `/ws/notifications/`
3. **Booking Updates** - ✅ Exists: `/ws/booking-updates/`
4. **Practitioner Availability** - ❌ Missing: `/ws/availability/{practitioner_id}/`

## 📊 Data Synchronization

### Frontend Caching Strategy
The frontend uses Tanstack Query with these cache times:
- User data: 5 minutes
- Service listings: 1 minute
- Practitioner profiles: 5 minutes
- Bookings: Real-time updates needed

**Recommendation:** Implement cache invalidation webhooks for:
- Booking status changes
- Service updates
- Availability changes

## 🚀 Implementation Priority

### High Priority (Block core functionality)
1. Time slot management APIs
2. Search and filtering enhancements
3. Favorites/saved items
4. Notification system

### Medium Priority (Enhance user experience)
1. Analytics dashboard APIs
2. Review system enhancements
3. Stream content interactions
4. Promotional features

### Low Priority (Nice to have)
1. Advanced recommendations
2. Practitioner promotional tools
3. Extended analytics

## 📝 Next Steps

1. **API Documentation**: Ensure all endpoints are documented in OpenAPI/Swagger
2. **Response Consistency**: Verify all APIs follow the same response format
3. **Error Handling**: Standardize error responses across all endpoints
4. **Performance**: Add pagination to all list endpoints
5. **Testing**: Create integration tests for all critical flows

## 🔐 Security Considerations

1. **Rate Limiting**: Implement appropriate limits for each endpoint
2. **Permission Checks**: Ensure proper authorization on all endpoints
3. **Data Validation**: Validate all input data
4. **CORS**: Configure for production domains only
5. **API Versioning**: Maintain backward compatibility