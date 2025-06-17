# Database Seeding Guide

This guide explains how to seed your development database with realistic test data.

## Overview

The seeding system provides three main management commands:

1. **`clear_db`** - Clears all data from the database (except migrations)
2. **`seed_db`** - Seeds the database with realistic test data
3. **`reset_db`** - Clears and reseeds the database in one command

## Usage

### Basic Commands

#### Clear Database
```bash
python manage.py clear_db
```
This will prompt for confirmation. To skip the prompt:
```bash
python manage.py clear_db --yes
```

#### Seed Database
```bash
python manage.py seed_db
```

With custom parameters:
```bash
python manage.py seed_db --users 50 --practitioners 20
```

#### Reset Database (Clear + Seed)
```bash
python manage.py reset_db
```

With custom parameters:
```bash
python manage.py reset_db --users 30 --practitioners 15 --yes
```

### Using the Helper Scripts

#### Interactive Script
```bash
./scripts/seed_dev_db.sh
```
This provides an interactive menu to choose between clearing, seeding, or resetting the database.

#### Docker Environment
```bash
docker-compose exec backend ./scripts/docker-seed.sh
```

Or set environment variables:
```bash
SEED_USERS=50 SEED_PRACTITIONERS=25 docker-compose exec backend ./scripts/docker-seed.sh
```

## What Gets Created

The seeding process creates:

### Base Data
- **Countries**: US, Canada, UK
- **States**: California, New York, Texas, Florida, Illinois
- **Cities**: San Francisco, Los Angeles, NYC, Austin, Miami
- **Languages**: English, Spanish, French, Mandarin, Arabic
- **Modalities**: Yoga, Meditation, Massage, Acupuncture, etc.
- **Service Categories**: Wellness, Fitness, Therapy, Coaching
- **Service Types**: Session, Workshop, Course, Package, Bundle
- **Subscription Tiers**: Basic, Professional, Enterprise

### Users (default: 20)
- Regular users with:
  - Profile information
  - Payment profiles
  - Credit balances
  - Payment methods (for some users)

### Practitioners (default: 10)
- Practitioners with:
  - Full profiles and bios
  - Locations and addresses
  - Schedules and availability
  - Certifications and education
  - Active subscriptions
  - Earnings balances

### Services
- 3-8 services per practitioner
- Various types: sessions, workshops, courses, packages, bundles
- Realistic pricing and durations
- Sessions created for workshops/courses

### Bookings
- 100 past bookings (completed with earnings)
- 50 future bookings (confirmed)
- 20 canceled bookings
- Earnings transactions for completed bookings

### Financial Data
- Credit purchase transactions
- Payment methods for users
- Earnings for practitioners
- Commission configurations

## Default Credentials

All seeded users (both regular users and practitioners) have the password:
```
testpass123
```

## Idempotency

The seeding commands use `get_or_create` for base data, making them mostly idempotent. However, users, services, and bookings will be created fresh each time you run the seed command.

## Development Workflow

1. **Fresh Start**: Use `reset_db` to get a clean database with test data
2. **Add More Data**: Use `seed_db` to add more test data to existing database
3. **Clean Slate**: Use `clear_db` when you need to start over

## Docker Compose Integration

Add this to your `docker-compose.yml` to automatically seed on startup:

```yaml
backend:
  environment:
    - SEED_USERS=30
    - SEED_PRACTITIONERS=15
  command: >
    sh -c "python manage.py wait_for_db &&
           python manage.py migrate &&
           python manage.py seed_db --users $${SEED_USERS:-20} --practitioners $${SEED_PRACTITIONERS:-10} &&
           python manage.py runserver 0.0.0.0:8000"
```

## Tips

1. The seeding process uses transactions, so if it fails, no partial data will be created
2. Adjust the number of users and practitioners based on your testing needs
3. The data is designed to be realistic with proper relationships and constraints
4. All timestamps are relative to the current date for realistic testing

## Troubleshooting

If you encounter errors:

1. Make sure all migrations are applied: `python manage.py migrate`
2. Check that all required apps are in INSTALLED_APPS
3. Ensure the database is running and accessible
4. Check for any custom validators that might reject the test data