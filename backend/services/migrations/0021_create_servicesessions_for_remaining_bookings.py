# Data migration to handle remaining bookings without service_sessions

from django.db import migrations
from django.utils import timezone


def create_sessions_for_remaining_bookings(apps, schema_editor):
    """
    Handle edge cases where bookings don't have service_session.

    This handles:
    1. Bookings with NULL start_time/end_time (draft bookings)
    2. Package/bundle parent bookings
    3. Course bookings that should link to course sessions
    4. Any other edge cases
    """
    Booking = apps.get_model('bookings', 'Booking')
    ServiceSession = apps.get_model('services', 'ServiceSession')
    Service = apps.get_model('services', 'Service')
    ServiceType = apps.get_model('services', 'ServiceType')

    # Find bookings without service_session
    bookings_without_session = Booking.objects.filter(
        service_session__isnull=True
    ).select_related('service', 'service__service_type')

    created_count = 0
    skipped_count = 0
    linked_existing = 0

    for booking in bookings_without_session:
        try:
            service_type_code = booking.service.service_type.code if booking.service.service_type else 'session'

            # Case 1: Workshop/Course bookings - try to find existing session
            if service_type_code in ['workshop', 'course']:
                # Try to find an existing session that matches the booking times
                if booking.start_time:
                    existing_session = ServiceSession.objects.filter(
                        service=booking.service,
                        start_time=booking.start_time
                    ).first()

                    if existing_session:
                        booking.service_session = existing_session
                        booking.save(update_fields=['service_session'])
                        linked_existing += 1
                        continue

            # Case 2: Bookings without times (draft, cancelled, etc.)
            if not booking.start_time or not booking.end_time:
                # Skip draft/unscheduled bookings - they'll get a session when scheduled
                print(f"Skipping booking {booking.id} - no start/end time (status: {booking.status})")
                skipped_count += 1
                continue

            # Case 3: Package/Bundle parent bookings
            if booking.is_package_purchase or booking.is_bundle_purchase:
                # Skip parent bookings - they don't need sessions
                print(f"Skipping booking {booking.id} - package/bundle parent booking")
                skipped_count += 1
                continue

            # Case 4: Regular bookings - create individual session
            duration_minutes = None
            if booking.start_time and booking.end_time:
                delta = booking.end_time - booking.start_time
                duration_minutes = int(delta.total_seconds() / 60)

            # Determine session type and visibility
            if service_type_code == 'workshop':
                session_type = 'workshop'
                visibility = 'public'
            elif service_type_code == 'course':
                session_type = 'course_session'
                visibility = 'public'
            else:
                session_type = 'individual'
                visibility = 'private'

            service_session = ServiceSession.objects.create(
                service=booking.service,
                session_type=session_type,
                visibility=visibility,
                start_time=booking.start_time,
                end_time=booking.end_time,
                duration=duration_minutes,
                max_participants=1,
                current_participants=1,
                sequence_number=0,
                status='scheduled',
            )

            booking.service_session = service_session
            booking.save(update_fields=['service_session'])

            created_count += 1

        except Exception as e:
            print(f"Error handling booking {booking.id}: {e}")
            import traceback
            traceback.print_exc()
            skipped_count += 1

    print(f"Created {created_count} new ServiceSessions")
    print(f"Linked {linked_existing} bookings to existing sessions")
    print(f"Skipped {skipped_count} bookings (draft/package/bundle)")

    # Report remaining issues
    remaining = Booking.objects.filter(service_session__isnull=True).count()
    if remaining > 0:
        print(f"WARNING: {remaining} bookings still without service_session")
        print("Run this query to investigate:")
        print("SELECT id, status, service_id, start_time, is_package_purchase, is_bundle_purchase FROM bookings_booking WHERE service_session_id IS NULL;")


def reverse_migration(apps, schema_editor):
    """Reverse migration - no-op since we don't want to delete sessions."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0020_rename_service_ses_service_idx_service_ses_service_c06988_idx_and_more'),
        ('bookings', '0012_remove_meeting_url_fields'),
    ]

    operations = [
        migrations.RunPython(
            create_sessions_for_remaining_bookings,
            reverse_migration
        ),
    ]
