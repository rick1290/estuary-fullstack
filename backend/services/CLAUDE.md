# Services App

## Overview
The services app manages all service offerings in the Estuary marketplace. It handles different types of services (sessions, workshops, courses, packages, bundles) through a unified Service model.

## Key Models

### ServiceCategory
- Organizes services into categories (e.g., "Wellness", "Fitness", "Therapy")
- Supports ordering and active/inactive states

### ServiceType
- Defines the type of service: `session`, `workshop`, `course`, `package`, `bundle`
- Each type has specific behavior and validation rules

### Service (Main Model)
The core model that represents any service offering. Uses `service_type` to determine behavior.

#### Service Types Explained:

1. **Session** (`service_type='session'`)
   - Individual appointments (e.g., "60-min Massage")
   - No child services or sessions
   - Simple price and duration

2. **Workshop** (`service_type='workshop'`)
   - Group events with specific dates/times
   - Has ServiceSessions for scheduling
   - Fixed participant limits

3. **Course** (`service_type='course'`)
   - Multi-session programs (e.g., "8-Week Yoga")
   - Has multiple ServiceSessions (one per class)
   - Sequential learning experience

4. **Package** (`service_type='package'`)
   - Mix of different services sold together
   - Uses ServiceRelationship to link included services
   - Example: "Wellness Journey" = consultation + 3 massages + 2 yoga

5. **Bundle** (`service_type='bundle'`)
   - Bulk purchase of same service
   - Uses `sessions_included` field
   - Example: "10-Class Yoga Pass"

### ServiceRelationship
- Links parent services (packages/bundles) to child services
- Tracks quantity, order, and discount percentages
- Handles both package contents and bundle definitions

### ServiceSession
- Scheduled instances of workshops or courses
- Has specific start/end times, location, participants
- Links to video rooms for virtual sessions

### ServicePractitioner
- Many-to-many relationship between services and practitioners
- Supports revenue sharing (commission splits)
- Tracks primary vs additional practitioners

## Money Handling

**IMPORTANT**: All monetary values are stored in **cents** as integers:
- `price_cents = 10000` means $100.00
- Use helper properties (`.price`) to get dollar values as Decimal
- When sending to Stripe: use cents directly
- When displaying to users: divide by 100

## Key Concepts

### Pricing Structure
```python
# Individual service
service.price_cents = 10000  # $100.00

# Bundle pricing
bundle.price_cents = 15000  # $150 for 10 classes
bundle.sessions_included = 10
bundle.price_per_session_cents  # 1500 ($15 per class)

# Package pricing
package.price_cents = 35000  # $350 total
package.original_price_cents  # Sum of included services
package.savings_percentage  # Discount percentage
```

### Service Availability
- `is_active`: Admin can disable
- `is_public`: Visible to users
- `available_from/until`: Time-based availability
- `max_per_customer`: Purchase limits (bundles)

### Practitioner Assignment
```python
# Primary practitioner (required)
service.primary_practitioner = practitioner

# Additional practitioners (optional)
service.additional_practitioners.add(
    practitioner2,
    through_defaults={'revenue_share_percentage': 30}
)
```

## Common Patterns

### Creating a Bundle
```python
# 10-class yoga pass
yoga_class = Service.objects.get(name="Drop-in Yoga")
bundle = Service.objects.create(
    service_type='bundle',
    name='10-Class Yoga Pass',
    price_cents=15000,  # $150
    sessions_included=10,
    validity_days=90,
    primary_practitioner=practitioner
)

# Link to the class that can be booked
ServiceRelationship.objects.create(
    parent_service=bundle,
    child_service=yoga_class,
    quantity=1
)
```

### Creating a Package
```python
# Wellness package with multiple services
package = Service.objects.create(
    service_type='package',
    name='New Client Wellness Package',
    price_cents=35000,  # $350
    primary_practitioner=practitioner
)

# Add included services
package.add_child_service(consultation, quantity=1)
package.add_child_service(massage, quantity=3, discount_percentage=10)
package.add_child_service(yoga, quantity=2)
```

### Creating Course Sessions
```python
course = Service.objects.create(
    service_type='course',
    name='8-Week Mindfulness',
    price_cents=20000  # $200
)

# Create weekly sessions
start_date = timezone.now()
for week in range(8):
    ServiceSession.objects.create(
        service=course,
        start_time=start_date + timedelta(weeks=week),
        end_time=start_date + timedelta(weeks=week, hours=1),
        sequence_number=week + 1
    )
```

## Validation Rules

1. **Bundles** must have:
   - `sessions_included` > 0
   - One child service via ServiceRelationship

2. **Packages** must have:
   - At least one child service
   - No `sessions_included`

3. **Courses/Workshops** must have:
   - ServiceSessions for scheduling

4. **All Services** must have:
   - `price_cents` >= 0
   - Valid `service_type`
   - Primary practitioner

## Integration Points

- **Bookings**: Services are booked through the bookings app
- **Payments**: Service prices determine booking costs
- **Practitioners**: Services belong to practitioners
- **Rooms**: Virtual services use video rooms
- **Reviews**: Users review services after completion

## Best Practices

1. Always use cents for money calculations
2. Use the appropriate service type (don't force everything into 'session')
3. Set proper availability windows for limited-time offers
4. Use ServiceRelationship for any parent-child service relationships
5. Track inventory with `sessions_included` for bundles
6. Use snapshots in bookings to preserve historical pricing