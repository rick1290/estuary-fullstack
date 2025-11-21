"""
Management command to create ServiceSessions for bookings that don't have one.
Handles edge cases like draft bookings, packages, bundles, etc.

Usage:
    python manage.py fix_missing_service_sessions --dry-run
    python manage.py fix_missing_service_sessions --execute
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from bookings.models import Booking
from services.models import ServiceSession


class Command(BaseCommand):
    help = 'Create ServiceSessions for bookings that are missing them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Actually execute the fixes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        execute = options['execute']

        if not dry_run and not execute:
            self.stdout.write(self.style.ERROR(
                'Must specify either --dry-run or --execute'
            ))
            return

        # Find bookings without service_session
        bookings_without_session = Booking.objects.filter(
            service_session__isnull=True
        ).select_related('service', 'service__service_type')

        total = bookings_without_session.count()
        self.stdout.write(f"\nFound {total} bookings without service_session\n")

        if total == 0:
            self.stdout.write(self.style.SUCCESS('All bookings have service_sessions!'))
            return

        # Categorize bookings
        no_times = []
        packages_bundles = []
        workshop_course = []
        regular = []

        for booking in bookings_without_session:
            if not booking.start_time or not booking.end_time:
                no_times.append(booking)
            elif booking.is_package_purchase or booking.is_bundle_purchase:
                packages_bundles.append(booking)
            elif booking.service.service_type and booking.service.service_type.code in ['workshop', 'course']:
                workshop_course.append(booking)
            else:
                regular.append(booking)

        # Report categories
        self.stdout.write("\nCategories:")
        self.stdout.write(f"  - No start/end time: {len(no_times)}")
        self.stdout.write(f"  - Package/Bundle parents: {len(packages_bundles)}")
        self.stdout.write(f"  - Workshop/Course: {len(workshop_course)}")
        self.stdout.write(f"  - Regular bookings: {len(regular)}\n")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n=== DRY RUN - No changes will be made ===\n"))

        # Process each category
        created_count = 0
        linked_count = 0
        skipped_count = 0

        # 1. Handle workshop/course bookings - try to link to existing sessions
        if workshop_course:
            self.stdout.write(f"\nProcessing {len(workshop_course)} workshop/course bookings...")
            for booking in workshop_course:
                if booking.start_time:
                    # Try to find existing session
                    existing = ServiceSession.objects.filter(
                        service=booking.service,
                        start_time=booking.start_time
                    ).first()

                    if existing:
                        if execute:
                            booking.service_session = existing
                            booking.save(update_fields=['service_session'])
                        self.stdout.write(f"  ✓ Linked booking {booking.id} to existing session {existing.id}")
                        linked_count += 1
                    else:
                        # Create new session
                        if execute:
                            session = ServiceSession.objects.create(
                                service=booking.service,
                                session_type='workshop' if booking.service.service_type.code == 'workshop' else 'course_session',
                                visibility='public',
                                start_time=booking.start_time,
                                end_time=booking.end_time,
                                duration=int((booking.end_time - booking.start_time).total_seconds() / 60),
                                max_participants=booking.max_participants or 10,
                                current_participants=1,
                            )
                            booking.service_session = session
                            booking.save(update_fields=['service_session'])
                        self.stdout.write(f"  + Created session for booking {booking.id}")
                        created_count += 1

        # 2. Handle regular bookings - create individual sessions
        if regular:
            self.stdout.write(f"\nProcessing {len(regular)} regular bookings...")
            for booking in regular:
                if execute:
                    duration = int((booking.end_time - booking.start_time).total_seconds() / 60)
                    session = ServiceSession.objects.create(
                        service=booking.service,
                        session_type='individual',
                        visibility='private',
                        start_time=booking.start_time,
                        end_time=booking.end_time,
                        duration=duration,
                        max_participants=1,
                        current_participants=1,
                    )
                    booking.service_session = session
                    booking.save(update_fields=['service_session'])
                self.stdout.write(f"  + Created individual session for booking {booking.id}")
                created_count += 1

        # 3. Report on bookings to skip
        if no_times:
            self.stdout.write(f"\nSkipping {len(no_times)} bookings without times (draft/unscheduled):")
            for booking in no_times[:10]:  # Show first 10
                self.stdout.write(f"  - Booking {booking.id} (status: {booking.status})")
            if len(no_times) > 10:
                self.stdout.write(f"  ... and {len(no_times) - 10} more")
            skipped_count += len(no_times)

        if packages_bundles:
            self.stdout.write(f"\nSkipping {len(packages_bundles)} package/bundle parent bookings:")
            for booking in packages_bundles[:10]:
                self.stdout.write(f"  - Booking {booking.id}")
            if len(packages_bundles) > 10:
                self.stdout.write(f"  ... and {len(packages_bundles) - 10} more")
            skipped_count += len(packages_bundles)

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"\nSummary:"))
        self.stdout.write(f"  Created: {created_count} new sessions")
        self.stdout.write(f"  Linked: {linked_count} to existing sessions")
        self.stdout.write(f"  Skipped: {skipped_count} (draft/package/bundle)")

        if execute:
            remaining = Booking.objects.filter(service_session__isnull=True).count()
            self.stdout.write(f"\nRemaining bookings without service_session: {remaining}")

            if remaining == 0:
                self.stdout.write(self.style.SUCCESS(
                    "\n✓ All bookings now have service_sessions!"
                    "\n  You can now run: python manage.py migrate bookings 0013"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"\n⚠ {remaining} bookings still without service_session"
                    "\n  Run with --dry-run to investigate"
                ))
        else:
            self.stdout.write(self.style.WARNING(
                "\nThis was a dry run. Use --execute to apply changes."
            ))
