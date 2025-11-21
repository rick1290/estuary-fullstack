# Data migration to create ServiceSessions for existing 1-to-1 bookings

from django.db import migrations
from django.utils import timezone


def create_service_sessions_for_bookings(apps, schema_editor):
    """
    Create ServiceSession records for all existing bookings that don't have one.

    This handles legacy 1-to-1 bookings that stored times directly on the Booking model.
    """
    Booking = apps.get_model('bookings', 'Booking')
    ServiceSession = apps.get_model('services', 'ServiceSession')
    Service = apps.get_model('services', 'Service')

    # Find all bookings without a service_session that have start/end times
    bookings_needing_sessions = Booking.objects.filter(
        service_session__isnull=True,
        start_time__isnull=False,
        end_time__isnull=False
    ).select_related('service')

    created_count = 0
    skipped_count = 0

    for booking in bookings_needing_sessions:
        try:
            # Calculate duration
            duration_minutes = None
            if booking.start_time and booking.end_time:
                delta = booking.end_time - booking.start_time
                duration_minutes = int(delta.total_seconds() / 60)

            # Determine max_participants (1 for individual sessions)
            max_participants = 1

            # Create ServiceSession
            service_session = ServiceSession.objects.create(
                service=booking.service,
                session_type='individual',  # These are all 1-to-1 sessions
                visibility='private',       # Not shown in public listings
                start_time=booking.start_time,
                end_time=booking.end_time,
                duration=duration_minutes,
                max_participants=max_participants,
                current_participants=1,  # The booking itself
                sequence_number=0,
                status='scheduled',  # Match booking status if needed
            )

            # Link booking to the new service_session
            booking.service_session = service_session
            booking.save(update_fields=['service_session'])

            created_count += 1

        except Exception as e:
            print(f"Error creating ServiceSession for booking {booking.id}: {e}")
            skipped_count += 1

    print(f"Created {created_count} ServiceSessions for existing bookings")
    if skipped_count > 0:
        print(f"Skipped {skipped_count} bookings due to errors")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - delete ServiceSessions created by this migration.

    CAUTION: This only deletes individual/private sessions created during migration.
    """
    ServiceSession = apps.get_model('services', 'ServiceSession')

    # Only delete sessions that were clearly created by this migration
    # (individual, private sessions)
    deleted = ServiceSession.objects.filter(
        session_type='individual',
        visibility='private'
    ).delete()

    print(f"Deleted {deleted[0]} individual ServiceSessions")


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0018_populate_session_type_and_visibility'),
        ('bookings', '0012_remove_meeting_url_fields'),  # Latest booking migration
    ]

    operations = [
        migrations.RunPython(
            create_service_sessions_for_bookings,
            reverse_migration
        ),
    ]
