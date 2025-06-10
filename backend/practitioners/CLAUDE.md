# Practitioners App

## Overview
The practitioners app manages professional service providers in the Estuary marketplace. It extends the User model with practitioner-specific functionality including scheduling, verification, and professional profiles.

## Key Relationships

### User → Practitioner Relationship
- **Every practitioner MUST be a user first**
- Practitioner has OneToOne relationship with User
- User.is_practitioner flag indicates if user has practitioner profile

### Data Organization
Profile data is intentionally separated between personal and professional:

**User Model** (users app):
- Authentication (email, password)
- Basic info (first_name, last_name, phone_number)
- System fields (timezone, is_practitioner, account_status)
- **timezone**: User's preferred timezone for viewing content

**UserProfile Model** (users app) - PERSONAL:
- **display_name**: Personal/casual name for community features
- **bio**: Personal bio for social features
- **avatar_url**: Personal profile photo
- **location**: Personal/residential location
- Gender, birthdate

**Practitioner Model** (practitioners app) - PROFESSIONAL:
- **display_name**: Professional name shown to clients
- **bio**: Professional bio highlighting credentials
- **profile_image_url**: Professional headshot
- **professional_title**: Credentials (e.g., "Licensed Therapist, LMFT")
- Years of experience
- Verification status
- Business settings (buffer_time)
- **primary_location**: Business/service location
- Professional relationships (certifications, specializations)

### Accessing Data
When working with practitioners, choose the appropriate profile:

```python
# PROFESSIONAL CONTEXT (showing to clients)
practitioner.display_name  # "Dr. Jane Smith"
practitioner.bio  # "Licensed therapist with 15 years..."
practitioner.profile_image_url  # Professional headshot
practitioner.professional_title  # "LMFT, PhD"

# PERSONAL CONTEXT (community features, if practitioner is also a client)
practitioner.user.profile.display_name  # "Jane"
practitioner.user.profile.bio  # "Mom of 2, love yoga..."
practitioner.user.profile.avatar_url  # Casual photo

# SYSTEM PREFERENCES
practitioner.user.timezone  # User's viewing preference
practitioner.schedule_preferences.timezone  # Default for new schedules
schedule.timezone  # Specific schedule timezone
```

## Schedule System

The scheduling system has multiple layers:

### 1. SchedulePreference
- One per practitioner
- Global scheduling preferences
- Advance booking limits
- Holiday settings

### 2. Schedule
- Named schedule templates (e.g., "Summer Hours", "Winter Schedule")
- Practitioner can have multiple schedules
- One marked as default
- Contains timezone for that specific schedule

### 3. ScheduleTimeSlot
- Weekly recurring availability
- Belongs to a Schedule
- Day of week + start/end times
- No overlapping slots allowed

### 4. ServiceSchedule
- Service-specific availability
- Overrides general schedule for specific services

### 5. ScheduleAvailability
- Actual available slots on specific dates
- Generated from ScheduleTimeSlots
- Used for booking availability checks

### 6. OutOfOffice
- Blocks of time when practitioner is unavailable
- Overrides all schedules

## Availability Flow

```
1. Check if date is in OutOfOffice → Not available
2. Get practitioner's default Schedule
3. Find ScheduleTimeSlots for that day of week
4. Check ServiceSchedule for service-specific times
5. Generate ScheduleAvailability slots
6. Check existing bookings for conflicts
7. Return available time slots
```

## Verification System

### VerificationDocument
- Stores credentials, licenses, certifications
- Status: pending → approved/rejected
- Expiry tracking for licenses

### PractitionerOnboardingProgress
- Tracks onboarding workflow steps
- Integrates with Temporal workflows
- Steps: profile → documents → background check → training → subscription → services

### Verification Status
- `is_verified`: Admin has approved practitioner
- `practitioner_status`: Current status (active, inactive, suspended, etc.)
- Both must be checked for practitioner availability

## Best Practices

### 1. Data Access
- Always access profile data through relationships
- Don't duplicate data between models
- Use properties for computed fields

### 2. Timezone Handling

The three-layer timezone system supports complex scenarios:

```python
# Scenario: NYC practitioner offers services to West Coast
practitioner.user.timezone = 'America/New_York'  # Lives in NYC
schedule_west = Schedule(
    name='West Coast Hours',
    timezone='America/Los_Angeles',  # Services offered in PT
    practitioner=practitioner
)

# When displaying to practitioner: Convert to America/New_York
# When displaying to LA client: Convert to America/Los_Angeles
# When storing: Keep in schedule timezone
```

**Rules**:
- Store times in Schedule.timezone
- Display to users in User.timezone
- Calculate availability in Schedule.timezone

### 3. Availability Checks
```python
def is_practitioner_available(practitioner, service, datetime):
    # Check practitioner is active
    if not practitioner.is_active:
        return False
    
    # Check out of office
    if OutOfOffice.objects.filter(
        practitioner=practitioner,
        from_date__lte=datetime.date(),
        to_date__gte=datetime.date()
    ).exists():
        return False
    
    # Check schedule availability
    # ... (implement based on schedule system)
    
    return True
```

### 4. Creating a Practitioner
```python
# 1. Create user first
user = User.objects.create_user(
    email='practitioner@example.com',
    first_name='Jane',
    last_name='Doe',
    is_practitioner=True
)

# 2. Create user profile
profile = UserProfile.objects.create(
    user=user,
    display_name='Dr. Jane Doe',
    bio='Experienced therapist...',
    avatar_url='https://...'
)

# 3. Create practitioner profile
practitioner = Practitioner.objects.create(
    user=user,
    professional_title='Licensed Therapist',
    years_of_experience=10,
    practitioner_status='pending'
)

# 4. Create schedule preference
SchedulePreference.objects.create(
    practitioner=practitioner,
    timezone=user.timezone,
    advance_booking_min_hours=24
)
```

## Common Queries

```python
# Get all active practitioners
Practitioner.objects.filter(
    is_verified=True,
    practitioner_status='active'
)

# Get practitioner's upcoming bookings
practitioner.bookings.filter(
    start_time__gte=timezone.now(),
    status='confirmed'
).order_by('start_time')

# Get practitioner's available services
Service.objects.filter(
    primary_practitioner=practitioner,
    is_active=True
)

# Check if practitioner has complete profile
def is_profile_complete(practitioner):
    user = practitioner.user
    profile = getattr(user, 'profile', None)
    
    return all([
        user.first_name,
        user.last_name,
        profile and profile.bio,
        profile and profile.avatar_url,
        practitioner.professional_title,
        practitioner.primary_location
    ])
```

## Integration Points

- **Users**: Base authentication and profile
- **Services**: Practitioners offer services
- **Bookings**: Clients book practitioner time
- **Payments**: Earnings and payouts
- **Reviews**: Clients review practitioners
- **Locations**: Service delivery locations

## Design Decisions

### Why Separate Personal/Professional Profiles?

1. **Privacy**: Practitioners may not want clients seeing personal info
2. **Branding**: Professional image differs from personal
3. **Multi-role**: Same person can be both client and practitioner
4. **Compliance**: Some jurisdictions require professional/personal separation

### Why Multiple Timezone Fields?

1. **User.timezone**: Display preference (see bookings in my timezone)
2. **Schedule.timezone**: Service delivery timezone (I work PT hours)
3. **Location.timezone**: Physical location reference

This supports practitioners who:
- Live in one timezone
- Serve clients in multiple timezones  
- Travel between locations
- Offer both local and virtual services