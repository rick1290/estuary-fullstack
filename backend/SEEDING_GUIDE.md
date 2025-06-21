# Database Seeding Guide

## Quick Start

### 1. Test Your Database Connection First
```bash
python manage.py dbshell
# If this works, exit with: \q
```

### 2. Run Migrations
```bash
python manage.py migrate
```

### 3. Choose Your Seeding Option

#### Option A: Minimal Seed (Recommended for Testing)
```bash
# Creates 1 admin, 1 client, 1 practitioner, 2 services, 2 bookings
python manage.py shell < seed_minimal.py

# Or using management command:
python manage.py seed_db --minimal
```

#### Option B: Full Seed (Complete Test Data)
```bash
# Creates full marketplace with multiple users, practitioners, services, bookings, reviews
python manage.py shell < seed_database.py

# Or using management command:
python manage.py seed_db
```

## Test Credentials

After seeding, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@estuary.com | admin123 |
| Client | client@example.com | password123 |
| Practitioner | practitioner@example.com | password123 |

### Additional Users (Full Seed Only)
- **Clients**: sarah.johnson@example.com, michael.chen@example.com, emma.williams@example.com
- **Practitioners**: maya.patel@example.com, david.kim@example.com, sophia.rodriguez@example.com
- **Password for all**: password123

## What Gets Created

### Minimal Seed
- 1 Admin user
- 1 Client with user profile
- 1 Practitioner (Jane Smith - Yoga instructor)
- 2 Services (1 session, 1 workshop)
- 1 Completed booking with payment
- 1 Future booking
- Basic location data (USA, California, San Francisco)

### Full Seed
- 1 Admin user
- 5 Clients with profiles and credits
- 3 Practitioners with full profiles:
  - Maya Patel (Yoga, Meditation, Breathwork)
  - Dr. David Kim (Acupuncture, Reiki, Qigong)
  - Sophia Rodriguez (Nutrition, Life Coaching, Mindfulness)
- 6+ Services (sessions, workshops, packages)
- 10 Completed bookings with payments and reviews
- 5 Future bookings
- Complete location data (multiple cities)
- Languages, modalities, specializations, insurance types
- Practitioner schedules and certifications

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```
   ImportError: cannot import name 'X' from 'Y'
   ```
   - Check that all apps are in INSTALLED_APPS
   - Verify model names match what's in the files

2. **Database Errors**
   ```
   django.db.utils.OperationalError
   ```
   - Ensure database is running
   - Check DATABASE_URL in .env
   - Run migrations: `python manage.py migrate`

3. **Unique Constraint Errors**
   - The scripts use get_or_create() to be idempotent
   - If you get errors, try resetting the database:
   ```bash
   python manage.py flush
   python manage.py migrate
   ```

4. **Missing Dependencies**
   ```bash
   pip install faker django-countries
   ```

## Testing After Seeding

### 1. Django Admin
```bash
# Login to admin
http://localhost:8000/admin/
# Use: admin@estuary.com / admin123
```

### 2. API Testing
```python
# In Django shell
python manage.py shell

from users.models import User
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking

print(f"Users: {User.objects.count()}")
print(f"Practitioners: {Practitioner.objects.count()}")
print(f"Services: {Service.objects.count()}")
print(f"Bookings: {Booking.objects.count()}")

# Test API endpoints
from rest_framework.test import APIClient
client = APIClient()
response = client.get('/api/v1/services/services/')
print(response.status_code)  # Should be 200 or 401
```

### 3. Frontend Testing
```bash
# Start backend
python manage.py runserver

# In frontend-2
npm run dev

# Test login with seeded credentials
```

## Resetting Everything

To start fresh:
```bash
# Option 1: Keep database structure, remove data
python manage.py flush

# Option 2: Drop all tables and recreate
python manage.py reset_db  # If you have django-extensions
# Or manually:
python manage.py dbshell
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# Then migrate and seed again
python manage.py migrate
python manage.py seed_db
```

## Customizing Seed Data

Edit the seed scripts to add your own test data:

1. **Add more users**: Edit the `client_data` list
2. **Add more practitioners**: Edit the `practitioner_data` list
3. **Add more services**: Add to the service creation loop
4. **Change locations**: Edit the cities/states section
5. **Adjust prices**: Change `hourly_rate` and `price` values

## Production Warning

⚠️ **NEVER run these seed scripts in production!** They:
- Create test users with weak passwords
- Generate fake data
- Are meant only for development/testing