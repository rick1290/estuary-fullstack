# Estuary FastAPI Architecture

## Overview
The Estuary FastAPI serves as the primary API layer for a comprehensive wellness marketplace with integrated content creator platform. It supports multiple user types (clients, practitioners, content creators) with sophisticated monetization and subscription models.

## Architecture Principles

### 1. Multi-Tenant Revenue Model
```
🏥 Healthcare Marketplace (Airbnb-style)
└── Practitioners offer services (sessions, workshops, courses)
└── Clients book and pay for services
└── Platform takes commission

💳 Platform Subscriptions (SaaS-style)  
└── Practitioners pay for platform access
└── Tiered features (Free/Entry/Premium)
└── Commission rates vary by tier

🎬 Content Creator Platform (OnlyFans-style)
└── Practitioners create subscription streams
└── Fans subscribe to exclusive content
└── Tips and pay-per-post monetization
```

### 2. Payment Flow Architecture
```
CLIENT PAYMENTS                    PRACTITIONER EARNINGS
     │                                      │
     ▼                                      ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Orders    │───▶│   Credits    │───▶│  Bookings   │
│             │    │              │    │             │
│ Stripe      │    │ Balance      │    │ Service     │
│ Payment     │    │ Tracking     │    │ Completion  │
│ Processing  │    │ Transfers    │    │ Validation  │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
                                              ▼
                                   ┌─────────────────┐
                                   │    Earnings     │
                                   │                 │
                                   │ Commission      │
                                   │ Calculation     │
                                   │ (Tier-based)    │
                                   └─────────────────┘
                                              │
                                              ▼
                                   ┌─────────────────┐
                                   │    Payouts      │
                                   │                 │
                                   │ Stripe Connect  │
                                   │ Bank Transfers  │
                                   │ Weekly Batches  │
                                   └─────────────────┘
```

## API Structure

### Core Domains
```
/api/v1/
├── auth/              # Authentication & JWT tokens
├── users/             # User management
├── practitioners/     # Practitioner profiles & onboarding
├── services/          # Service catalog & management
├── bookings/          # Appointment booking & scheduling
├── payments/          # Orders, credits, earnings, payouts
├── locations/         # Geographic data & search
├── reviews/           # Rating & review system
├── messaging/         # Real-time communication
├── notifications/     # Multi-channel notifications
├── media/             # File upload & management
├── rooms/             # Video call integration
├── analytics/         # Business intelligence
├── search/            # Discovery & filtering
└── streams/           # Content creator platform
```

### Authentication Flow
```python
# JWT-based authentication with role-based access
Authorization: Bearer <jwt_token>

# User roles affect API access:
- Regular User: Basic booking & purchasing
- Practitioner: Service management & earnings
- Staff: Admin operations & analytics
- Superuser: Full system access
```

## Key Features by Domain

### 🔐 **Authentication & Users**
- JWT token-based auth with refresh tokens
- Social login integration (Google, Apple, Facebook)
- Role-based permissions (User, Practitioner, Staff)
- Password reset and email verification

### 👨‍⚕️ **Practitioners**
- Multi-step onboarding with progress tracking
- Profile management with media galleries
- Availability management with calendar integration
- Subscription tier management (Free/Entry/Premium)

### 🛍️ **Services & Booking**
- Hierarchical service structure (Services → Packages → Bundles)
- Real-time availability checking
- Advanced scheduling with calendar integration
- Package completion tracking with progressive payouts

### 💳 **Payments & Monetization**
- **User Credits**: Purchase, transfer, and spend system
- **Stripe Integration**: Secure payment processing
- **Commission System**: Tier-based commission rates
- **Practitioner Earnings**: Automatic payout calculations
- **Subscription Billing**: Recurring practitioner subscriptions

### 🎬 **Content Creator Platform (Streams)**
- **Tiered Subscriptions**: Free, Entry, Premium content access
- **Content Management**: Rich posts with media galleries
- **Live Interactions**: Comments, likes, and real-time engagement
- **Monetization**: Subscription fees + one-time tips
- **Analytics**: Revenue tracking and audience insights

### 📱 **Communication**
- **Messaging**: Real-time chat with WebSocket support
- **Notifications**: Email, SMS, push, and in-app alerts
- **Video Calls**: Integrated video rooms for sessions

### 📊 **Analytics & Business Intelligence**
- **Practitioner Dashboard**: Earnings, bookings, and performance
- **Platform Analytics**: User acquisition and revenue metrics
- **Stream Analytics**: Content performance and subscriber growth

## Subscription Systems Comparison

### 1. Practitioner Platform Subscriptions
```yaml
Purpose: Platform access and features
Billing: Monthly/Annual to Estuary
Tiers:
  Free:
    - 2 services max
    - 20% commission
    - Basic support
  Entry:
    - 20 services max  
    - 15% commission
    - Analytics access
  Premium:
    - Unlimited services
    - 10% commission
    - Advanced features
```

### 2. Stream Content Subscriptions
```yaml
Purpose: Content access for fans
Billing: Monthly subscriptions to practitioners
Tiers: Practitioner-defined (Free/Entry/Premium)
Features:
  - Custom tier names and pricing
  - Hierarchical content access
  - Tips and one-time payments
  - Analytics for content creators
```

## API Design Patterns

### 1. Consistent Response Format
```json
{
  "results": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

### 2. Error Handling
```json
{
  "detail": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists",
      "code": "unique_violation"
    }
  ]
}
```

### 3. Permission-Based Access
```python
# Automatic filtering based on user permissions
GET /api/v1/bookings/  # Returns only user's bookings
GET /api/v1/practitioners/me/earnings/  # Requires practitioner role
GET /api/v1/admin/analytics/  # Requires staff role
```

## Integration Points

### External Services
- **Stripe**: Payment processing and Connect payouts
- **Cloudflare R2**: Media storage and CDN
- **Daily.co**: Video call infrastructure
- **Courier**: Email and SMS notifications
- **Google Maps**: Location services and geocoding

### Real-time Features
- **WebSocket**: Live messaging and notifications
- **Webhooks**: Stripe payment events and status updates
- **Background Tasks**: Scheduled payouts and email delivery

## Security & Compliance

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **PII Handling**: GDPR/CCPA compliant data management
- **Audit Logs**: Complete financial transaction history
- **Access Control**: Role-based API permissions

### Financial Security
- **PCI Compliance**: No card data stored locally
- **Stripe Integration**: Secure payment processing
- **Commission Tracking**: Immutable financial records
- **Payout Verification**: Multi-step approval process

## Performance & Scalability

### Database Optimization
- **Indexing**: Strategic indexes on frequently queried fields
- **Caching**: Redis for session management and API responses
- **Async Operations**: Non-blocking I/O for all endpoints
- **Connection Pooling**: Efficient database connection management

### API Performance
- **Pagination**: Consistent pagination across all list endpoints
- **Field Selection**: GraphQL-style field selection where needed
- **Background Tasks**: Heavy operations moved to task queues
- **Rate Limiting**: API throttling to prevent abuse

## Deployment & Monitoring

### Infrastructure
- **Containerization**: Docker containers for easy deployment
- **Health Checks**: Built-in health monitoring endpoints
- **Logging**: Structured logging for observability
- **Metrics**: Prometheus-compatible metrics export

### Development Workflow
- **OpenAPI**: Auto-generated API documentation
- **Testing**: Comprehensive test suite with CI/CD
- **Type Safety**: Full type hints with Pydantic validation
- **Code Quality**: Automated linting and formatting

## Future Enhancements

### Planned Features
- **Mobile SDKs**: Native mobile app integration
- **Advanced Analytics**: ML-powered insights and recommendations
- **Marketplace Expansion**: Multi-tenant white-label solutions
- **International Support**: Multi-currency and localization

### Scalability Roadmap
- **Microservices**: Domain-specific service separation
- **Event Streaming**: Event-driven architecture with Kafka
- **CDN Integration**: Global content delivery optimization
- **Caching Layer**: Redis cluster for high-performance caching

This architecture provides a solid foundation for a sophisticated wellness marketplace while maintaining flexibility for future growth and feature expansion.