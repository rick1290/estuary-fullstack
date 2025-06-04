import logging
from django.core.management.base import BaseCommand
from apps.integrations.youtube.models import YouTubeVideo
from apps.integrations.youtube.tasks import process_youtube_video_upload

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process pending YouTube video uploads'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=5,
            help='Maximum number of videos to process'
        )
        parser.add_argument(
            '--video-id',
            type=str,
            help='Process a specific video by ID'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        video_id = options['video_id']
        
        if video_id:
            # Process a specific video
            try:
                video = YouTubeVideo.objects.get(id=video_id)
                self.stdout.write(f"Processing video: {video.title} ({video.id})")
                
                success = process_youtube_video_upload(video.id)
                if success:
                    self.stdout.write(self.style.SUCCESS(f"Successfully processed video: {video.title}"))
                else:
                    self.stdout.write(self.style.ERROR(f"Failed to process video: {video.title}"))
            except YouTubeVideo.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Video not found with ID: {video_id}"))
        else:
            # Process pending videos up to the limit
            pending_videos = YouTubeVideo.objects.filter(status='pending').order_by('created_at')[:limit]
            
            if not pending_videos:
                self.stdout.write("No pending videos to process")
                return
            
            self.stdout.write(f"Found {pending_videos.count()} pending videos to process")
            
            success_count = 0
            failure_count = 0
            
            for video in pending_videos:
                self.stdout.write(f"Processing video: {video.title} ({video.id})")
                
                success = process_youtube_video_upload(video.id)
                if success:
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f"Successfully processed video: {video.title}"))
                else:
                    failure_count += 1
                    self.stdout.write(self.style.ERROR(f"Failed to process video: {video.title}"))
            
            self.stdout.write(f"Processed {success_count + failure_count} videos: {success_count} successful, {failure_count} failed")
