# Users App

## Overview
The users app provides core authentication and user profile functionality for the Estuary marketplace. It serves as the foundation for both clients and practitioners.

## Key Models

### User
Core authentication model extending django-use-email-as-username:
- Email-based authentication (no username)
- Basic identity fields (first_name, last_name, phone_number)
- System preferences (timezone, account_status)
- Role flag (is_practitioner)

### UserProfile
Extended profile for personal information:
- Personal display name and bio
- Avatar image
- Demographics (gender, birthdate)
- Personal location preference

### UserSocialLinks
Social media presence (separate for cleanliness):
- All major platforms supported
- Optional for all users

### UserPaymentProfile
Payment and billing information:
- Stripe customer/account IDs
- Billing address
- Payment preferences

### UserFavoritePractitioner
Many-to-many relationship tracking favorite practitioners

## Design Philosophy

### Separation of Concerns
The app is split into multiple models to:
1. **Security**: Keep payment data separate
2. **Performance**: Load only needed data
3. **Flexibility**: Optional components (social, payment)
4. **Privacy**: Separate personal from professional

### Personal vs Professional Profiles
**Important**: UserProfile contains PERSONAL information, while professional information lives in the Practitioner model. This separation is intentional:

- **UserProfile**: How you appear in community features, as a client
- **Practitioner**: How you appear to clients as a service provider

Example:
```python
# Same person, different contexts
user.profile.display_name = "Johnny"  # Casual name
user.profile.bio = "Dad, runner, coffee lover"  # Personal bio

user.practitioner_profile.display_name = "Dr. Jonathan Smith"  # Professional
user.practitioner_profile.bio = "15 years experience in..."  # Professional
```

## User Creation Flow

### Regular User (Client)
```python
# 1. Create user
user = User.objects.create_user(
    email='client@example.com',
    first_name='John',
    last_name='Doe',
    timezone='America/New_York'
)

# 2. Create profile (optional but recommended)
profile = UserProfile.objects.create(
    user=user,
    display_name='John',
    bio='Love wellness and meditation'
)

# 3. Create payment profile when needed
payment_profile = UserPaymentProfile.objects.create(
    user=user,
    stripe_customer_id='cus_xxx'
)
```

### Practitioner User
```python
# 1. Create user with practitioner flag
user = User.objects.create_user(
    email='practitioner@example.com',
    first_name='Jane',
    last_name='Smith',
    is_practitioner=True,
    timezone='America/Los_Angeles'
)

# 2. Create personal profile
UserProfile.objects.create(
    user=user,
    display_name='Jane',  # Personal name
    bio='Mom, yoga enthusiast'  # Personal bio
)

# 3. Create practitioner profile (in practitioners app)
# This is separate and contains professional info
```

## Timezone Strategy

**User.timezone** is the user's display preference:
- All dates/times shown to user are converted to this timezone
- Used for email notifications
- Used for booking confirmations
- NOT necessarily where they offer services (practitioners)

## Account Status

The `account_status` field controls user access:
- `active`: Normal access
- `inactive`: User initiated deactivation
- `suspended`: Admin initiated suspension
- `pending`: Awaiting email verification
- `deleted`: Soft deleted (data retained)

## Best Practices

### 1. Always Create User First
User is the foundation - all other models depend on it.

### 2. Use Appropriate Profile
- Community features → UserProfile
- Professional features → Practitioner model
- Don't mix personal/professional data

### 3. Handle Missing Profiles
```python
# Safe access pattern
display_name = getattr(user.profile, 'display_name', None) or user.full_name
```

### 4. Timezone Conversions
```python
from django.utils import timezone
import pytz

# Convert UTC to user's timezone
user_tz = pytz.timezone(user.timezone)
local_time = utc_time.astimezone(user_tz)
```

## Common Queries

```python
# Get users with complete profiles
User.objects.filter(
    profile__isnull=False,
    profile__bio__isnull=False,
    profile__avatar_url__isnull=False
)

# Get active practitioners
User.objects.filter(
    is_practitioner=True,
    account_status='active',
    practitioner_profile__is_verified=True
)

# Get user's favorite practitioners
user.favorite_practitioners.filter(
    practitioner__practitioner_status='active'
)

# Find users by location
UserProfile.objects.filter(
    location__city='New York'
).select_related('user')
```

## Integration Points

- **Practitioners**: Users who provide services
- **Bookings**: Users book services
- **Payments**: Users have credit balances and payment methods
- **Reviews**: Users review services and practitioners
- **Messaging**: Users communicate with each other
- **Notifications**: Users receive system notifications

## Security Considerations

1. **Email Verification**: Required for account activation
2. **Phone Verification**: Optional but recommended for practitioners
3. **Payment Data**: Stored separately with limited access
4. **Soft Deletes**: User data retained for legal/financial records
5. **IP Tracking**: Last login IP for security monitoring

## API Considerations

- Use UUID for public API exposure (never expose integer PK)
- UserProfile data should be optional in API responses
- Payment profile data requires additional authentication
- Social links can be public or private based on user preference