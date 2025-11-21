"""
Management command to create draft ServiceSessions for existing draft bookings.
This implements the new architecture where ALL bookings have ServiceSessions.

Usage:
    python manage.py create_draft_service_sessions --dry-run
    python manage.py create_draft_service_sessions --execute
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from bookings.models import Booking
from services.models import ServiceSession


class Command(BaseCommand):
    help = 'Create draft ServiceSessions for existing draft bookings'

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

        # Find draft bookings without service_session
        draft_bookings = Booking.objects.filter(
            service_session__isnull=True,
            status='draft'
        ).select_related('service')

        total = draft_bookings.count()
        self.stdout.write(f"\nFound {total} draft bookings without service_session\n")

        if total == 0:
            self.stdout.write(self.style.SUCCESS('All draft bookings have service_sessions!'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("\n=== DRY RUN - No changes will be made ===\n"))

        created_count = 0

        for booking in draft_bookings:
            if execute:
                with transaction.atomic():
                    # Create draft ServiceSession with NULL times
                    service_session = ServiceSession.objects.create(
                        service=booking.service,
                        session_type='individual',
                        visibility='private',
                        start_time=None,  # Unscheduled
                        end_time=None,
                        duration=booking.service.duration_minutes or 60,
                        max_participants=1,
                        current_participants=0,
                        status='draft',
                    )

                    # Link booking to ServiceSession
                    booking.service_session = service_session
                    booking.save(update_fields=['service_session'])

                self.stdout.write(f"  ✓ Created draft ServiceSession {service_session.id} for booking {booking.id}")
            else:
                self.stdout.write(f"  → Would create draft ServiceSession for booking {booking.id}")

            created_count += 1

        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"\nSummary:"))
        self.stdout.write(f"  Created: {created_count} draft ServiceSessions")

        if execute:
            remaining = Booking.objects.filter(
                service_session__isnull=True,
                status='draft'
            ).count()

            if remaining == 0:
                self.stdout.write(self.style.SUCCESS(
                    "\n✓ All draft bookings now have draft ServiceSessions!"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"\n⚠ {remaining} draft bookings still without service_session"
                ))
        else:
            self.stdout.write(self.style.WARNING(
                "\nThis was a dry run. Use --execute to apply changes."
            ))
