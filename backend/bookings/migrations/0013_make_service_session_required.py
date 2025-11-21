# Migration to verify ServiceSession data migration completed
# RUN THIS ONLY AFTER verifying migration 0019 in services app completed successfully

from django.db import migrations


class Migration(migrations.Migration):
    """
    Verify ServiceSession data migration completed successfully.

    This migration verifies that all SCHEDULED bookings (those with start_time)
    have a service_session.

    NEW ARCHITECTURE (post-refactor):
    - ALL bookings have a service_session (even drafts)
    - Draft bookings have ServiceSession with NULL start_time/end_time
    - ServiceSession is updated with times when user schedules the booking

    LEGACY CHECK (for old draft bookings during migration):
    - Draft/unscheduled bookings MAY have NULL service_session temporarily
    - They'll get one when scheduled

    IMPORTANT: This should only be run AFTER:
    1. services.0019_create_servicesessions_for_existing_bookings has been applied
    2. All scheduled bookings have been verified to have a service_session

    To check if ready:
        SELECT COUNT(*) FROM bookings_booking
        WHERE service_session_id IS NULL
        AND start_time IS NOT NULL
        AND status NOT IN ('draft', 'cancelled');
        (should return 0)
    """

    dependencies = [
        ('bookings', '0012_remove_meeting_url_fields'),
        ('services', '0019_create_servicesessions_for_existing_bookings'),  # Ensure data migration ran first
    ]

    operations = [
        # Verify only SCHEDULED bookings have service_session
        # NEW ARCHITECTURE: Draft bookings also have service_session (with NULL times)
        # LEGACY: Old draft bookings may temporarily have NULL service_session during migration
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM bookings_booking
                        WHERE service_session_id IS NULL
                        AND start_time IS NOT NULL
                        AND status NOT IN ('draft', 'cancelled')
                    ) THEN
                        RAISE EXCEPTION 'Cannot make service_session required: % SCHEDULED bookings still have NULL service_session',
                            (SELECT COUNT(*) FROM bookings_booking
                             WHERE service_session_id IS NULL
                             AND start_time IS NOT NULL
                             AND status NOT IN ('draft', 'cancelled'));
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Keep service_session nullable to support legacy draft bookings
        # NEW ARCHITECTURE: All new bookings get service_session (even drafts)
        # Field remains nullable for backward compatibility during migration
    ]
