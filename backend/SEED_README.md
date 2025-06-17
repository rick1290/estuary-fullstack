# Database Seeding Scripts

This directory contains scripts for seeding the Estuary database with test data.

## Available Scripts

### 1. Full Seed Script (`seed_database.py`)
A comprehensive seed script that creates a full set of test data including:
- Multiple users (admin + 8 regular users)
- 5 practitioners with full profiles
- Various services (sessions, workshops, packages)
- 50 bookings (past and future)
- Reviews and ratings
- Payment records
- Locations (countries, states, cities)
- All supporting data (modalities, categories, etc.)

**Usage:**
```bash
python manage.py shell < seed_database.py
# OR
python manage.py seed_db
```

### 2. Minimal Seed Script (`seed_minimal.py`)
A lightweight script that creates only essential test data:
- 1 admin user
- 1 client user  
- 1 practitioner with profile
- 2 services
- 2 bookings
- Basic location data

**Usage:**
```bash
python manage.py shell < seed_minimal.py
```

## Test Users Created

### Full Seed Script Users:
- **Admin**: admin@estuary.com / admin123
- **Clients**: 
  - john.doe@example.com / password123
  - jane.smith@example.com / password123
  - michael.j@example.com / password123
  - sarah.w@example.com / password123
  - (and more...)
- **Practitioners**: First 5 users become practitioners

### Minimal Seed Script Users:
- **Admin**: admin@estuary.com / admin123
- **Client**: client@example.com / password123
- **Practitioner**: practitioner@example.com / password123

## Notes

1. **Database State**: These scripts use `get_or_create` for most operations, so they can be run multiple times safely.

2. **Transactions**: The full seed script runs in a transaction, so if any error occurs, no data will be saved.

3. **Customization**: You can modify the scripts to create different types of test data by editing the data arrays at the top of each section.

4. **Performance**: The full seed script creates a lot of data and may take 30-60 seconds to run.

## Troubleshooting

If you encounter errors:

1. **Import Errors**: Make sure you're running from the correct directory and Django is properly configured
   ```bash
   cd backend
   export DJANGO_SETTINGS_MODULE=config.settings.local
   ```

2. **Constraint Violations**: The scripts handle most uniqueness constraints, but if you see errors, you may need to clear existing data first

3. **Missing Dependencies**: Ensure all required models exist and migrations have been run:
   ```bash
   python manage.py migrate
   ```

## Development Tips

- Use the minimal seed for quick testing
- Use the full seed when you need realistic data volumes
- Modify the number of records created by adjusting the loop ranges
- Add your own test scenarios by extending the scripts