"""
Management command to clean up abandoned draft services
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from services.models import Service, ServiceStatusEnum
from media.models import Media, MediaEntityType
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up abandoned draft services older than specified hours'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Delete draft services older than this many hours (default: 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--keep-with-media',
            action='store_true',
            help='Keep draft services that have associated media'
        )
        parser.add_argument(
            '--keep-with-sessions',
            action='store_true',
            help='Keep draft services that have associated sessions'
        )
    
    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        keep_with_media = options['keep_with_media']
        keep_with_sessions = options['keep_with_sessions']
        
        # Calculate cutoff time
        cutoff_time = timezone.now() - timedelta(hours=hours)
        
        # Find draft services older than cutoff
        draft_services = Service.objects.filter(
            status=ServiceStatusEnum.DRAFT,
            created_at__lt=cutoff_time
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Found {draft_services.count()} draft services older than {hours} hours"
            )
        )
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No services will be deleted"))
        
        deleted_count = 0
        kept_count = 0
        media_deleted_count = 0
        
        for service in draft_services:
            # Check if we should keep this service
            should_keep = False
            
            if keep_with_media:
                media_count = Media.objects.filter(
                    entity_type=MediaEntityType.SERVICE,
                    entity_id=service.public_uuid
                ).count()
                if media_count > 0:
                    should_keep = True
                    self.stdout.write(
                        f"  Keeping service {service.id} '{service.name}' - has {media_count} media files"
                    )
            
            if keep_with_sessions and not should_keep:
                sessions_count = service.service_sessions.count()
                if sessions_count > 0:
                    should_keep = True
                    self.stdout.write(
                        f"  Keeping service {service.id} '{service.name}' - has {sessions_count} sessions"
                    )
            
            if should_keep:
                kept_count += 1
                continue
            
            # Delete associated media first
            if not dry_run:
                with transaction.atomic():
                    # Delete media files
                    media_items = Media.objects.filter(
                        entity_type=MediaEntityType.SERVICE,
                        entity_id=service.public_uuid
                    )
                    
                    for media in media_items:
                        try:
                            # The media model should handle storage cleanup on delete
                            media.delete()
                            media_deleted_count += 1
                        except Exception as e:
                            logger.error(f"Error deleting media {media.id}: {e}")
                    
                    # Delete the service
                    service.delete()
                    deleted_count += 1
            else:
                # Dry run - just count
                media_count = Media.objects.filter(
                    entity_type=MediaEntityType.SERVICE,
                    entity_id=service.public_uuid
                ).count()
                deleted_count += 1
                media_deleted_count += media_count
            
            self.stdout.write(
                f"  {'Would delete' if dry_run else 'Deleted'} service {service.id} "
                f"'{service.name}' created {service.created_at}"
            )
        
        # Summary
        self.stdout.write(self.style.SUCCESS("\nSummary:"))
        self.stdout.write(f"  Services {'would be' if dry_run else ''} deleted: {deleted_count}")
        self.stdout.write(f"  Services kept: {kept_count}")
        self.stdout.write(f"  Media files {'would be' if dry_run else ''} deleted: {media_deleted_count}")
        
        if not dry_run and deleted_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSuccessfully cleaned up {deleted_count} abandoned draft services"
                )
            )