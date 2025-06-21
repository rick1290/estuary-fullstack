# Seed Script Analysis & Issues

## 🔴 Current Status: All seed scripts are BROKEN

Your suspicion is correct - the seeding scripts won't work due to model changes and incorrect import paths.

## Issues Found

### 1. Import Path Problems

All scripts use incorrect import paths:

```python
# ❌ WRONG (in seed_db.py)
from practitioners.models import Practitioner
from users.models import User
from services.models import Service

# ❌ WRONG (in seed_db_fixed.py)
from apps.users.models import User
from apps.practitioners.models import Practitioner

# ✅ CORRECT (should be)
from users.models import User
from practitioners.models import Practitioner
from services.models import Service
```

### 2. Non-Existent Models

Scripts reference models that don't exist:

```python
# ❌ These models are referenced but don't exist:
from payments.models import CreditTransaction  # Not in current models
from utils.models import Language              # Not in utils/models.py
from users.models import UserFavorite         # It's UserFavoritePractitioner now
```

### 3. Model Field Mismatches

Many field references are outdated:

```python
# Examples of potential issues:
- Practitioner fields like 'languages' (ManyToMany that might not exist)
- Service scheduling fields that have changed
- Payment model structure differences
```

### 4. Missing Dependencies

```python
# Scripts expect these packages:
- django-seed (with monkey patches for Django 4.0+)
- Faker
- django-countries
```

## File-by-File Analysis

### `seed_db.py` (2141 lines)
- **Purpose**: Comprehensive seeding with users, practitioners, services, bookings, etc.
- **Status**: ❌ Broken - wrong imports, missing models
- **Complexity**: Very complex with many interdependencies

### `seed_db_fixed.py` (558 lines)
- **Purpose**: Simplified version focusing on core models
- **Status**: ❌ Broken - uses 'apps.' prefix that doesn't exist
- **Better than**: seed_db.py (simpler, but still broken)

### `seed_service_locations.py`
- **Purpose**: Seeds service locations
- **Status**: ❌ Broken - wrong imports with 'apps.' prefix

### `seed_test_locations.py`
- **Purpose**: Seeds test location data
- **Status**: ❌ Broken - wrong imports

### `setup_site.py`
- **Purpose**: Sets up Django sites framework
- **Status**: ✅ Might work - simpler, fewer dependencies

## Quick Test Results

```bash
# Testing if scripts run:
$ python manage.py shell
>>> from utils.seed_db import Command
ImportError: cannot import name 'Practitioner' from 'practitioners.models'

>>> from utils.seed_db_fixed import run
ImportError: No module named 'apps'
```

## What's Salvageable

1. **Logic and Structure**: The seeding logic is good, just needs import fixes
2. **Faker Usage**: Good examples of realistic data generation
3. **Relationships**: Shows how to properly link models
4. **Django-seed Patches**: The timezone fix is still needed

## Recommended Actions

### Option 1: Fix Existing Scripts (Time: 2-4 hours)
1. Update all import statements
2. Remove references to non-existent models
3. Update field references to match current models
4. Test incrementally

### Option 2: Create New Minimal Seed Script (Time: 1-2 hours)
Start fresh with a simple script that seeds only essential data:
- 10 users
- 5 practitioners  
- 20 services
- Sample bookings
- Basic payments

### Option 3: Use Django Fixtures (Time: 1 hour)
Create JSON fixtures from existing data or manually:
```bash
python manage.py dumpdata users.User --indent 2 > fixtures/users.json
python manage.py loaddata fixtures/users.json
```

## Testing the Current Models

Before fixing seed scripts, verify your models work:

```python
# Run this in Django shell to test model creation:
from users.models import User
from practitioners.models import Practitioner
from services.models import Service

# Test user creation
user = User.objects.create_user(
    email='test@example.com',
    password='testpass123',
    first_name='Test',
    last_name='User'
)

# Test practitioner creation
practitioner = Practitioner.objects.create(
    user=user,
    bio='Test practitioner',
    hourly_rate=100
)

# Test service creation
service = Service.objects.create(
    practitioner=practitioner,
    title='Test Service',
    description='Test description',
    price=50,
    duration=60,
    service_type='session'
)
```

## Dependencies Check

```bash
# Check if required packages are installed:
pip list | grep -E "django-seed|Faker|django-countries"

# If missing:
pip install django-seed faker django-countries
```