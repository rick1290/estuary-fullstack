# Migration Plan for Practitioner Model

## Overview
This document outlines the migration plan for implementing the new Practitioner model structure in the Estuary application. The migration will be performed in two steps:

1. Schema migration: Create the Practitioner model and update all foreign key references
2. Data migration: Populate the Practitioner model with data from existing users

## Step 1: Schema Migration
Run the standard Django migration command to create the necessary database schema changes:
```bash
python manage.py makemigrations practitioners
```

This will create a migration file that:
- Creates the new Practitioner model with a one-to-one relationship to the User model
- Updates all foreign key references in related models to point to the Practitioner model instead of the User model

## Step 2: Data Migration
Create a data migration to populate the Practitioner model with data from existing users:

```bash
python manage.py makemigrations practitioners --empty --name=populate_practitioner_model
```

Edit the generated migration file to include the following logic:

```python
from django.db import migrations

def create_practitioner_profiles(apps, schema_editor):
    """
    Create practitioner profiles for all existing users who are practitioners.
    
    We'll identify practitioners based on whether they have related records in 
    practitioner-specific tables like SchedulePreference, ServiceSchedule, etc.
    """
    User = apps.get_model('users', 'User')
    Practitioner = apps.get_model('practitioners', 'Practitioner')
    
    # Get all models that have practitioner references
    Service = apps.get_model('services', 'Service')
    Package = apps.get_model('services', 'Package')
    Category = apps.get_model('services', 'Category')
    WorkshopSession = apps.get_model('services', 'WorkshopSession')
    
    # Find all users who have services (these are definitely practitioners)
    practitioner_user_ids = set()
    
    # Add users with services
    for service in Service.objects.all():
        if service.practitioner_id:
            practitioner_user_ids.add(service.practitioner_id)
    
    # Add users with packages
    for package in Package.objects.all():
        if package.practitioner_id:
            practitioner_user_ids.add(package.practitioner_id)
    
    # Add users with categories
    for category in Category.objects.all():
        if category.practitioner_id:
            practitioner_user_ids.add(category.practitioner_id)
    
    # Add users with workshop sessions
    for session in WorkshopSession.objects.all():
        if session.practitioner_id:
            practitioner_user_ids.add(session.practitioner_id)
    
    # Create practitioner profiles for all identified practitioners
    for user_id in practitioner_user_ids:
        try:
            user = User.objects.get(id=user_id)
            Practitioner.objects.create(
                user=user,
                is_verified=False,  # Default values
                years_of_experience=0,
                average_rating=0.0,
                total_reviews=0,
                featured=False,
                completed_sessions=0,
                cancellation_rate=0.0
            )
            print(f"Created practitioner profile for user {user.username}")
        except User.DoesNotExist:
            print(f"User with ID {user_id} not found")
        except Exception as e:
            print(f"Error creating practitioner profile for user {user_id}: {e}")

def reverse_practitioner_profiles(apps, schema_editor):
    """
    Remove all practitioner profiles.
    """
    Practitioner = apps.get_model('practitioners', 'Practitioner')
    Practitioner.objects.all().delete()

class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0001_initial'),  # Update this to the actual initial migration
    ]

    operations = [
        migrations.RunPython(create_practitioner_profiles, reverse_practitioner_profiles),
    ]
```

## Step 3: Run Migrations
After creating both migration files, run the migrations:

```bash
python manage.py migrate
```

## Step 4: Verification
After running the migrations, verify that:
1. All practitioner profiles were created correctly
2. All foreign key references are working properly
3. The application functions as expected with the new model structure

## Rollback Plan
If issues are encountered, the migrations can be rolled back:

```bash
python manage.py migrate practitioners zero
```

This will revert all migrations for the practitioners app. Then, the models can be adjusted and the migration process can be attempted again.
