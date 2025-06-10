# UUID to BaseModel Migration Plan

## Overview
This document outlines the migration plan for converting models with UUID primary keys to use BaseModel/PublicModel pattern for consistency across the codebase.

## Current State

The following models in the practitioners app currently use UUID as primary key:

1. **Schedule** (UUID primary key)
2. **ScheduleTimeSlot** (UUID primary key)  
3. **ServiceSchedule** (UUID primary key)
4. **OutOfOffice** (UUID primary key)
5. **Question** (UUID primary key)
6. **Certification** (UUID primary key)
7. **Education** (UUID primary key)

## Target State

According to our patterns:
- **BaseModel**: For internal models (integer PK + timestamps)
- **PublicModel**: For models exposed via API (integer PK + public_uuid + soft delete + timestamps)

## Migration Strategy

### Option 1: Update Models in Place (For Development)

Since we're in development, we can update the models directly:

1. **Update Model Definitions**

```python
# Change from:
class Schedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # ... rest of fields

# To:
class Schedule(BaseModel):
    # BaseModel provides: id (AutoField), created_at, updated_at
    # ... rest of fields (remove manual timestamp fields)
```

2. **Create Migration File**

```bash
# First backup existing data if needed
docker-compose exec api python manage.py dumpdata practitioners > practitioners_backup.json

# Create migration
docker-compose exec api python manage.py makemigrations practitioners
```

3. **Update Foreign Keys**

The migration will need to handle foreign key updates:
- ScheduleTimeSlot.schedule_id references
- ServiceSchedule references  
- Many-to-many relationships with Certification/Education

### Option 2: Data Migration (For Production)

If this were production, we'd need a more careful approach:

```python
from django.db import migrations

def convert_uuid_to_int(apps, schema_editor):
    """Convert UUID PKs to integer PKs"""
    Schedule = apps.get_model('practitioners', 'Schedule')
    
    # 1. Add temporary integer field
    # 2. Populate with sequential values
    # 3. Update all foreign keys
    # 4. Drop UUID field
    # 5. Rename temp field to id

class Migration(migrations.Migration):
    dependencies = [
        ('practitioners', 'XXXX_previous'),
    ]
    
    operations = [
        migrations.RunPython(convert_uuid_to_int),
    ]
```

## Implementation Steps

### Step 1: Update Model Files

```python
# practitioners/models.py

# Update imports
from utils.models import BaseModel, PublicModel

# Update Schedule
class Schedule(BaseModel):
    name = models.CharField(max_length=100)
    practitioner = models.ForeignKey(Practitioner, on_delete=models.CASCADE, related_name='schedules')
    # Remove id, created_at, updated_at fields

# Update ScheduleTimeSlot  
class ScheduleTimeSlot(BaseModel):
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='time_slots')
    # Remove id, created_at, updated_at fields

# Similar updates for other models...
```

### Step 2: Update API Serializers

Since we're changing from UUID strings to integers:

```python
# api/v1/schemas/practitioners.py

class ScheduleResponse(BaseModel):
    id: int  # Changed from str
    # ... rest of fields
```

### Step 3: Reset Database (Development Only)

```bash
# Drop and recreate database
docker-compose down -v
docker-compose up -d postgres

# Run migrations
docker-compose exec api python manage.py migrate

# Load test data
docker-compose exec api python manage.py seed_db
```

## API Impact

- Schedule IDs will change from UUID strings to integers
- Update frontend to handle integer IDs
- No more UUID string conversion needed in views

## Benefits

1. **Consistency**: All models follow same pattern
2. **Performance**: Integer PKs are faster than UUIDs
3. **Simplicity**: No more UUID-to-string conversions
4. **Standards**: Follows Django best practices
