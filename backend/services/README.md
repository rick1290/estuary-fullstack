# Services Module

The Services module manages the core service offerings in the Estuary platform. It uses a normalized architecture that separates service delivery formats from pricing strategies, providing maximum flexibility for practitioners and clear user experiences.

## Architecture Overview

### Core Concepts

**Services** define WHAT practitioners offer:
- Session (1-on-1 or group)
- Workshop (multi-hour events)
- Course (sequential learning programs)

**Packages & Bundles** define HOW services are sold:
- Package: Different services combined together
- Bundle: Bulk pricing for the same service

This separation allows services to be sold individually, in packages, or as bundles without data duplication.

## Models

### Service (PublicModel)
The primary model representing individual services offered by practitioners.

**Key Fields:**
- `name`, `description` - Service details
- `price`, `duration_minutes` - Basic pricing and timing
- `service_type` - References ServiceType (session/workshop/course)
- `primary_practitioner` - Main practitioner
- `max_participants`, `min_participants` - Capacity management
- `location_type` - virtual/in_person/hybrid
- `is_course` - Flag for multi-session courses

**Relationships:**
- ServiceCategory (many-to-one)
- ServiceType (many-to-one)
- Practitioner (many-to-many through ServicePractitioner)
- Location (many-to-one)
- Languages (many-to-many)

### Package (PublicModel)
Represents combinations of different services sold as a unit.

**Example:** "Wellness Journey" package containing:
- 1x Initial consultation
- 3x Massage sessions
- 1x Yoga class
- Home care kit

**Key Fields:**
- `name`, `description` - Package details
- `price`, `original_price` - Pricing with savings calculation
- `validity_days` - How long package is valid
- `practitioner` - Package creator
- `is_transferable` - Whether can be gifted

**Calculated Properties:**
- `savings_amount` - Dollar savings vs individual prices
- `savings_percentage` - Percentage savings

### PackageService (Junction Model)
Links packages to included services with quantities and ordering.

**Key Fields:**
- `package`, `service` - The relationship
- `quantity` - How many of this service included
- `order` - Display order within package
- `is_mandatory` - Whether service must be used
- `notes` - Special instructions

### Bundle (PublicModel)
Represents bulk purchase options for a single service.

**Example:** "5-Class Yoga Pass" - Buy 5 classes, get 1 free

**Key Fields:**
- `service` - The service this bundle is for
- `sessions_included` - Paid sessions
- `bonus_sessions` - Free bonus sessions
- `price` - Bundle price
- `validity_days` - Expiration period
- `max_per_customer` - Purchase limits

**Calculated Properties:**
- `total_sessions` - Paid + bonus sessions
- `price_per_session` - Effective cost per session
- `savings_amount` - Dollar savings vs individual
- `savings_percentage` - Percentage savings

**Availability Methods:**
- `is_available()` - Checks active status and date restrictions

## Supporting Models

### ServiceCategory
Organizes services (Wellness, Therapy, Fitness, etc.)

### ServiceType
Defines service modalities (Massage, Yoga, Counseling, etc.)

### ServiceSession
Represents scheduled instances of workshops/courses

### ServicePractitioner
Junction table for multiple practitioners per service

### ServiceRelationship
Handles prerequisites and related services

### Waitlist
Manages demand when services are fully booked

## Usage Examples

### Creating a Package
```python
# Create a wellness package
package = Package.objects.create(
    name="Complete Wellness Journey",
    description="Start your wellness journey with our comprehensive package",
    practitioner=practitioner,
    price=Decimal('450.00'),
    original_price=Decimal('550.00'),  # Sum of individual prices
    validity_days=180
)

# Add services to the package
PackageService.objects.create(
    package=package,
    service=consultation_service,
    quantity=1,
    order=1
)
PackageService.objects.create(
    package=package,
    service=massage_service,
    quantity=3,
    order=2
)
```

### Creating a Bundle
```python
# Create a yoga class bundle
bundle = Bundle.objects.create(
    name="Yoga 5-Pack",
    service=yoga_service,
    sessions_included=5,
    bonus_sessions=1,  # Buy 5, get 1 free
    price=Decimal('400.00'),  # vs $90 x 6 = $540 individual
    validity_days=365
)
```

### Booking a Package
```python
# Customer purchases a package
booking = BookingFactory.create_package_booking(
    user=customer,
    package=wellness_package
)
# This creates:
# - 1 parent booking for the package
# - Child bookings for each included service (pending until scheduled)
```

### Booking a Bundle
```python
# Customer purchases a bundle
booking = BookingFactory.create_bundle_booking(
    user=customer,
    bundle=yoga_bundle
)
# This creates a credit balance for future use
```

## API Considerations

### Unified Service Catalog
When displaying services, you can show everything together:

```python
# Get all offerings for a practitioner
services = Service.objects.filter(practitioner=practitioner, is_active=True)
packages = Package.objects.filter(practitioner=practitioner, is_active=True)
bundles = Bundle.objects.filter(service__primary_practitioner=practitioner, is_active=True)
```

### Search Integration
Services, packages, and bundles can all be searched together:
- Searching "massage" finds massage services, packages containing massage, and massage bundles
- Filtering by price range works across all three types
- Category filtering applies to services and packages

### Display Patterns
**Service Card:**
```
[Swedish Massage]
💆 Session
60 min - $120
```

**Package Card:**
```
[Stress Relief Package]
📦 Package - Save $50
• Consultation
• 3 Massages  
• Aromatherapy Kit
```

**Bundle Card:**
```
[5-Class Yoga Bundle]
🎯 Bundle - Save 20%
Buy 5, get 1 free
$400 (vs $540 individual)
```

## Database Performance

### Indexing Strategy
- `Service`: indexed on practitioner, category, service_type, location_type
- `Package`: indexed on practitioner, category, featured status
- `Bundle`: indexed on service, availability dates, featured status
- `PackageService`: indexed on package and service relationships

### Query Optimization
- Use `select_related()` for practitioner and category relationships
- Use `prefetch_related()` for package services and languages
- Consider denormalizing frequently accessed calculated fields for high-traffic views

## Migration Notes

This module implements a normalized architecture that separates service types from pricing strategies. If migrating from a denormalized approach:

1. **Service Types**: Remove bundle/package from service type choices
2. **Existing Data**: Migrate package/bundle services to new Package/Bundle models
3. **Bookings**: Update booking logic to reference new models
4. **APIs**: Update endpoints to handle unified service catalogs

## Future Enhancements

### Potential Additions
- **Memberships**: Monthly subscription models
- **Corporate Packages**: B2B bulk pricing
- **Gift Cards**: Monetary value vs service-specific
- **Dynamic Pricing**: Time-based or demand-based pricing
- **Package Builder**: UI for practitioners to create custom packages
- **Bundle Analytics**: Track which bundle strategies perform best

### Scalability Considerations
- Consider caching for frequently accessed package/bundle calculations
- Implement background jobs for complex package operations
- Add audit trails for pricing changes
- Consider read replicas for catalog browsing

## Admin Interface

The Django admin provides comprehensive management for all service-related models:

- **Services**: Full service management with inline practitioners
- **Packages**: Package creation with inline service selection
- **Bundles**: Bundle configuration with pricing validation
- **Categories & Types**: Taxonomy management

All models include proper foreign key relationships and validation to ensure data integrity.