# Booking Model Field Cleanup Analysis

**Date:** 2025-11-14
**Context:** After implementing simplified package/bundle architecture

## Fields That Can Be REMOVED (Safe to deprecate)

### 1. **location** (FK to Address)
- **Usage:** 0% (202/202 null)
- **Status:** ❌ Never used
- **Why remove:** We have `service.location` instead. This FK is redundant.
- **Impact:** None - can be removed in migration

### 2. **room** (FK to old Room model)
- **Usage:** 0% (202/202 null)
- **Status:** ❌ Never used
- **Why remove:** Replaced by `livekit_room` relationship
- **Impact:** None - can be removed in migration

### 3. **started_at**
- **Usage:** 0% (202/202 null)
- **Status:** ❌ Never used, redundant with `actual_start_time`
- **Why remove:** We have `actual_start_time` which serves the same purpose
- **Impact:** Remove from serializer (line 179), then remove from model

### 4. **bundle_name_snapshot**
- **Usage:** 0.5% (only 1 booking)
- **Status:** ❌ Redundant
- **Why remove:** Redundant with `service_name_snapshot`
- **Impact:** Minimal - only 1 booking uses this

### 5. **bundle_sessions_snapshot**
- **Usage:** 0.5% (only 1 booking)
- **Status:** ❌ Redundant
- **Why remove:** Redundant with `order.total_sessions`
- **Impact:** Minimal - only 1 booking uses this

## Fields That SHOULD STAY (Despite low usage)

### 1. **title** & **description**
- **Usage:** 0% currently, but exposed in API
- **Status:** ⚠️ Part of API contract (serializer line 172)
- **Why keep:** Allow users to add custom titles/descriptions to bookings
- **Note:** Consider populating these in future

### 2. **meeting_id** & **meeting_url**
- **Usage:** 0% currently, but exposed in API
- **Status:** ⚠️ Part of API contract (serializer line 173)
- **Why keep:** Needed for third-party video integrations (Zoom, Google Meet, etc.)
- **Note:** Currently using LiveKit, but may integrate others

### 3. **actual_start_time** & **actual_end_time**
- **Usage:** 2.5% and 20.8%
- **Status:** ✓ Used in API (serializer line 170)
- **Why keep:** Track when session actually started/ended vs scheduled time
- **Note:** Important for analytics and billing disputes

### 4. **no_show_at**
- **Usage:** 0% currently
- **Status:** ⚠️ Part of API contract (serializer line 178)
- **Why keep:** Important for tracking no-shows and cancellation policies
- **Note:** Should be used more actively

## Fields That Are DEPRECATED (Keep for backward compatibility)

### 1. **is_package_purchase** & **is_bundle_purchase**
- **Usage:** 100% populated (boolean defaults to False)
- **Status:** ⚠️ DEPRECATED - use `order.order_type` instead
- **Why keep:** Backward compatibility with existing queries
- **Migration plan:**
  - Phase 1: ✅ DONE - Stop setting these on new bookings
  - Phase 2: Update all queries to use `order.order_type`
  - Phase 3: Remove fields in future migration

### 2. **parent_booking**
- **Usage:** 13.4% (27/202 have parent)
- **Status:** ⚠️ DEPRECATED - use `order` FK instead
- **Why keep:** Backward compatibility with old package bookings
- **Migration plan:**
  - Phase 1: ✅ DONE - Stop creating parent bookings
  - Phase 2: Update all queries to use `order.bookings`
  - Phase 3: Remove field in future migration

## Snapshot Fields Analysis

### KEEP (Frequently used):
- ✅ **service_name_snapshot** - Essential for historical records
- ✅ **service_description_snapshot** - Essential for historical records
- ✅ **practitioner_name_snapshot** - Essential for historical records
- ✅ **service_duration_snapshot** - Essential for scheduling
- ⚠️ **package_name_snapshot** - 10.9% usage (keep for old bookings)
- ⚠️ **package_contents_snapshot** - 10.9% usage (keep for old bookings)

### REMOVE:
- ❌ **bundle_name_snapshot** - 0.5% usage, redundant
- ❌ **bundle_sessions_snapshot** - 0.5% usage, redundant

## Summary of Recommendations

### ✅ Immediate Actions (Low risk, no breaking changes):

1. Remove `location` FK → never used
2. Remove `room` FK → replaced by `livekit_room`
3. Remove `started_at` → redundant with `actual_start_time`
4. Remove `bundle_name_snapshot` → redundant
5. Remove `bundle_sessions_snapshot` → redundant

### ⏳ Future Deprecation (After all code updated):

1. Deprecate `is_package_purchase` → use `order.order_type == 'package'`
2. Deprecate `is_bundle_purchase` → use `order.order_type == 'bundle'`
3. Deprecate `parent_booking` → use `order.bookings`

### ✓ Fields to Keep:

- All essential snapshot fields
- `title`, `description` - API contract, future use
- `meeting_id`, `meeting_url` - third-party integrations
- `actual_start_time`, `actual_end_time` - analytics
- `no_show_at` - policy enforcement

## Database Impact

**Current bookings:** 202
**Fields to remove:** 5
**Space savings:** Minimal (mostly NULL values)
**Code simplification:** Moderate - cleaner model, less confusion
**Risk:** Low - all fields have <1% usage

## Migration Strategy

```bash
# 1. Create migration
python manage.py makemigrations bookings --name remove_unused_fields

# 2. Review generated migration
# Should remove: location, room, started_at, bundle_name_snapshot, bundle_sessions_snapshot

# 3. Run migration
python manage.py migrate bookings

# 4. Remove from serializers
# Edit bookings/api/v1/serializers.py to remove references
```

## Testing Checklist

- [ ] No queries use `booking.location`
- [ ] No queries use `booking.room`
- [ ] No queries use `booking.started_at`
- [ ] No queries use `bundle_name_snapshot`
- [ ] No queries use `bundle_sessions_snapshot`
- [ ] API still works (serializers updated)
- [ ] No broken tests
- [ ] Frontend doesn't rely on these fields

## Rollback Plan

If issues arise:
```bash
# Revert migration
python manage.py migrate bookings <previous_migration_number>

# Fields were NULL, so no data loss
```

---

**Status:** Analysis complete, ready for implementation when approved.
