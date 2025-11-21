# ServiceSession Refactoring - Migration Guide

## Overview
This migration refactors the booking system to use ServiceSession as the single source of truth for scheduling information across ALL booking types (individual sessions, workshops, and courses).

## What Changed

### Architecture
- **Before**: Individual 1-to-1 bookings stored times directly on Booking model
- **After**: ALL bookings reference a ServiceSession that stores the schedule

### Benefits
1. Consistent data model across all booking types
2. Simpler room management (always via ServiceSession)
3. Easier querying and reporting
4. Better support for rescheduling and capacity management

## Migration Steps

### Step 1: Apply Schema Migrations
Run these migrations in order:

```bash
# 1. Add new fields to ServiceSession
python manage.py migrate services 0017_add_session_type_and_visibility_to_servicesession

# 2. Populate fields for existing ServiceSessions
python manage.py migrate services 0018_populate_session_type_and_visibility

# 3. Create ServiceSessions for existing 1-to-1 bookings
python manage.py migrate services 0019_create_servicesessions_for_existing_bookings
```

### Step 2: Verify Data Migration
Before proceeding, verify all bookings have a service_session:

```sql
-- Should return 0
SELECT COUNT(*)
FROM bookings_booking
WHERE service_session_id IS NULL;

-- Check distribution of session types
SELECT
    ss.session_type,
    ss.visibility,
    COUNT(*) as count
FROM services_servicesession ss
GROUP BY ss.session_type, ss.visibility;
```

Expected results:
- `individual` / `private` = existing 1-to-1 bookings
- `workshop` / `public` = workshop sessions
- `course_session` / `public` = course sessions

### Step 3: Test Application
Deploy and test the application with these migrations applied:

1. **Test booking creation**:
   - Create a new 1-to-1 session booking → Should create private ServiceSession
   - Create a workshop booking → Should use existing public ServiceSession
   - Create a course booking → Should use existing public ServiceSession

2. **Test booking display**:
   - View booking details → Times should display correctly
   - View practitioner schedule → All sessions should show
   - View upcoming bookings → Should work for all types

3. **Test notifications**:
   - Booking confirmations → Should include correct times
   - Reminders → Should trigger at correct times
   - Cancellations → Should work correctly

4. **Test room access**:
   - Join video room from booking → Should work for all types
   - Room should always be accessed via service_session

### Step 4: Make service_session Required (Optional)
After verifying everything works, you can make service_session required:

```bash
python manage.py migrate bookings 0013_make_service_session_required
```

⚠️ **WARNING**: This step is IRREVERSIBLE without data loss. Only run after:
- Confirming Step 2 shows 0 bookings without service_session
- Testing thoroughly in production
- Taking a database backup

## API Changes

### Frontend Updates Needed

#### Old Code (Deprecated)
```javascript
// ❌ OLD - Don't use
const startTime = booking.start_time;
const endTime = booking.end_time;
```

#### New Code (Recommended)
```javascript
// ✅ NEW - Use these
const startTime = booking.computed_start_time || booking.service_session?.start_time;
const endTime = booking.computed_end_time || booking.service_session?.end_time;

// Even better - use the nested service_session object
const sessionDetails = booking.service_session;
console.log(sessionDetails.start_time, sessionDetails.end_time);
console.log(sessionDetails.session_type);  // 'individual', 'workshop', 'course_session'
console.log(sessionDetails.visibility);    // 'public', 'private', 'unlisted'
```

### New Fields Available
```javascript
{
  "booking": {
    "id": 123,
    "service_session": {  // NEW: Always present
      "id": 456,
      "session_type": "individual",
      "visibility": "private",
      "start_time": "2025-01-15T14:00:00Z",
      "end_time": "2025-01-15T15:00:00Z",
      "duration": 60,
      "max_participants": 1,
      "current_participants": 1
    },
    "computed_start_time": "2025-01-15T14:00:00Z",  // NEW: Computed field
    "computed_end_time": "2025-01-15T15:00:00Z",    // NEW: Computed field
    "start_time": "2025-01-15T14:00:00Z",  // DEPRECATED: For backward compatibility
    "end_time": "2025-01-15T15:00:00Z"     // DEPRECATED: For backward compatibility
  }
}
```

## Rollback Plan

If issues arise, you can rollback migrations:

```bash
# Rollback to before ServiceSession refactor
python manage.py migrate services 0016_remove_servicesession_address_and_more
python manage.py migrate bookings 0012_remove_meeting_url_fields

# NOTE: Data migration rollback will delete individual ServiceSessions
# created during migration. Bookings will revert to using direct time fields.
```

⚠️ **WARNING**: Rolling back after making service_session required (Step 4) is complex and may require manual intervention.

## Verification Queries

### Check ServiceSession Coverage
```sql
-- All bookings should have a service_session
SELECT
    COUNT(*) as total_bookings,
    COUNT(service_session_id) as bookings_with_session,
    COUNT(*) - COUNT(service_session_id) as bookings_without_session
FROM bookings_booking;
```

### Check Session Type Distribution
```sql
SELECT
    session_type,
    visibility,
    COUNT(*) as count,
    MIN(start_time) as earliest,
    MAX(start_time) as latest
FROM services_servicesession
GROUP BY session_type, visibility
ORDER BY session_type, visibility;
```

### Check for Duplicate Times (Should be none)
```sql
-- Individual sessions can share times with the same service
-- But workshops/courses should not have duplicates
SELECT
    service_id,
    start_time,
    COUNT(*) as count
FROM services_servicesession
WHERE session_type IN ('workshop', 'course_session')
GROUP BY service_id, start_time
HAVING COUNT(*) > 1;
```

## Troubleshooting

### Issue: Bookings still have NULL service_session
**Solution**: Run migration 0019 again or manually create ServiceSessions:
```python
from bookings.models import Booking
from services.models import ServiceSession

for booking in Booking.objects.filter(service_session__isnull=True, start_time__isnull=False):
    session = ServiceSession.objects.create(
        service=booking.service,
        session_type='individual',
        visibility='private',
        start_time=booking.start_time,
        end_time=booking.end_time,
        max_participants=1,
        current_participants=1
    )
    booking.service_session = session
    booking.save()
```

### Issue: Times not displaying correctly
**Solution**: Ensure frontend uses `computed_start_time` or `service_session.start_time`

### Issue: Reminders not triggering
**Solution**: Check that reminder tasks use `booking.get_start_time()` helper method

## Support

For issues or questions:
1. Check the verification queries above
2. Review migration logs for errors
3. Test in staging environment first
4. Keep database backups before each step

## Timeline Recommendation

1. **Day 1**: Apply migrations 0017-0018 in production
2. **Day 2-3**: Monitor for issues, verify data
3. **Day 1**: Apply migration 0019 (create ServiceSessions for existing bookings)
4. **Day 5-7**: Test thoroughly, monitor metrics
5. **Week 2+**: Consider applying migration 0013 (make service_session required)

Take your time with each step and verify thoroughly before proceeding.
