import os
import tempfile
import requests
import logging
from django.conf import settings
from .models import YouTubeVideo
from .utils import upload_video_to_youtube
from .video_processing.utils import process_video

logger = logging.getLogger(__name__)


def process_youtube_video_upload(video_id):
    """
    Process a pending YouTube video upload.
    
    Args:
        video_id: UUID of the YouTubeVideo record
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get the video record
        youtube_video = YouTubeVideo.objects.get(id=video_id, status='pending')
        
        # Mark as processing
        youtube_video.mark_as_processing()
        
        # Download the video from Cloudflare R2
        response = requests.get(youtube_video.source_file_url)
        if response.status_code != 200:
            raise Exception(f"Failed to download video: HTTP {response.status_code}")
        
        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
            temp_file.write(response.content)
            source_video_path = temp_file.name
        
        try:
            # Process the video with branding
            processed_video_path = None
            try:
                # Only process the video if the flag is set
                if youtube_video.apply_video_processing:
                    processed_video_path = process_video(
                        input_video_path=source_video_path,
                        add_logo=True,
                        add_intro=False,  # Set to True if you have an intro video
                        add_outro=False,  # Set to True if you have an outro video
                        logo_position='bottom-right',
                        logo_opacity=0.7
                    )
                    
                    # Use the processed video for upload
                    upload_video_path = processed_video_path
                    logger.info(f"Video processed successfully: {processed_video_path}")
                else:
                    logger.info("Video processing skipped as per settings")
                    upload_video_path = source_video_path
                
            except Exception as e:
                logger.error(f"Error processing video: {str(e)}")
                logger.info("Falling back to original video for upload")
                upload_video_path = source_video_path
            
            # Get practitioner details for the video
            practitioner = youtube_video.practitioner
            
            # Generate title and description if not provided
            title = youtube_video.title or f"{practitioner.display_name or practitioner.user.get_full_name()} - Practitioner Profile"
            description = youtube_video.description or f"Meet {practitioner.display_name or practitioner.user.get_full_name()}, a practitioner on Estuary."
            
            if practitioner.title and not youtube_video.description:
                description += f"\n\nSpecialty: {practitioner.title}"
            
            if practitioner.bio and not youtube_video.description:
                description += f"\n\n{practitioner.bio}"
            
            # Add a standard footer if using generated description
            if not youtube_video.description:
                description += "\n\nLearn more at https://estuary.com"
            
            # Set tags based on practitioner specialties
            tags = ["estuary", "wellness", "practitioner"]
            
            # Upload to YouTube
            video_id = upload_video_to_youtube(
                video_file_path=upload_video_path,
                title=title,
                description=description,
                tags=tags,
                privacy_status=youtube_video.privacy_status
            )
            
            # Update the record
            youtube_video.mark_as_uploaded(video_id)
            
            return True
            
        finally:
            # Clean up the temporary files
            if os.path.exists(source_video_path):
                os.unlink(source_video_path)
            
            if processed_video_path and os.path.exists(processed_video_path) and processed_video_path != source_video_path:
                os.unlink(processed_video_path)
                
    except Exception as e:
        logger.error(f"Failed to process YouTube video upload: {str(e)}")
        
        # Mark as failed if we have a record
        if 'youtube_video' in locals():
            youtube_video.mark_as_failed(str(e))
        
        return False
