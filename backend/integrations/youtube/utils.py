import os
import google.oauth2.credentials
import googleapiclient.discovery
import googleapiclient.errors
from googleapiclient.http import MediaFileUpload
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# YouTube API scopes
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'


def get_youtube_client():
    """
    Create a YouTube API client using OAuth2 credentials.
    
    Returns:
        googleapiclient.discovery.Resource: YouTube API client
    """
    try:
        # Get credentials from settings
        credentials = google.oauth2.credentials.Credentials(
            token=None,
            refresh_token=settings.YOUTUBE_REFRESH_TOKEN,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.YOUTUBE_CLIENT_ID,
            client_secret=settings.YOUTUBE_CLIENT_SECRET
        )
        
        # Build the YouTube API client
        youtube = googleapiclient.discovery.build(
            API_SERVICE_NAME, 
            API_VERSION, 
            credentials=credentials,
            cache_discovery=False
        )
        
        return youtube
    
    except Exception as e:
        logger.error(f"Error creating YouTube client: {str(e)}")
        raise


def upload_video_to_youtube(video_file_path, title, description, tags=None, category_id="22", privacy_status="unlisted"):
    """
    Upload a video to YouTube.
    
    Args:
        video_file_path (str): Path to the video file
        title (str): Video title
        description (str): Video description
        tags (list): List of tags for the video
        category_id (str): YouTube category ID (default: "22" for People & Blogs)
        privacy_status (str): Privacy status (default: "unlisted")
        
    Returns:
        str: YouTube video ID
        
    Raises:
        Exception: If upload fails
    """
    try:
        if not os.path.exists(video_file_path):
            raise FileNotFoundError(f"Video file not found: {video_file_path}")
        
        youtube = get_youtube_client()
        
        # Prepare the metadata for the video
        body = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags or [],
                "categoryId": category_id
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False
            }
        }
        
        # Prepare the media file
        media = MediaFileUpload(
            video_file_path, 
            mimetype="video/*", 
            resumable=True
        )
        
        # Execute the upload request
        request = youtube.videos().insert(
            part=",".join(body.keys()),
            body=body,
            media_body=media
        )
        
        # Upload the video
        response = request.execute()
        
        # Return the YouTube video ID
        return response.get("id")
    
    except Exception as e:
        logger.error(f"Error uploading video to YouTube: {str(e)}")
        raise


def upload_practitioner_video_to_youtube(practitioner, video_file_path):
    """
    Upload a practitioner's profile video to YouTube.
    
    Args:
        practitioner: Practitioner model instance
        video_file_path (str): Path to the video file
        
    Returns:
        str: YouTube video ID
    """
    # Generate title and description based on practitioner information
    title = f"{practitioner.display_name or practitioner.user.get_full_name()} - Practitioner Profile"
    description = f"Meet {practitioner.display_name or practitioner.user.get_full_name()}, a practitioner on Estuary."
    
    if practitioner.title:
        description += f"\n\nSpecialty: {practitioner.title}"
    
    if practitioner.bio:
        description += f"\n\n{practitioner.bio}"
    
    # Add a standard footer
    description += "\n\nLearn more at https://estuary.com"
    
    # Set tags based on practitioner specialties
    tags = ["estuary", "wellness", "practitioner"]
    
    # Upload the video
    video_id = upload_video_to_youtube(
        video_file_path=video_file_path,
        title=title,
        description=description,
        tags=tags,
        privacy_status="unlisted"  # Start as unlisted until approved
    )
    
    return video_id


def update_youtube_video_privacy(video_id, privacy_status="public"):
    """
    Update the privacy status of a YouTube video.
    
    Args:
        video_id (str): YouTube video ID
        privacy_status (str): New privacy status ("public", "private", or "unlisted")
        
    Returns:
        bool: True if successful
    """
    try:
        youtube = get_youtube_client()
        
        # Get the current video details
        video_response = youtube.videos().list(
            part="status",
            id=video_id
        ).execute()
        
        if not video_response.get("items"):
            raise Exception(f"Video not found with ID: {video_id}")
        
        # Update the privacy status
        video_response["items"][0]["status"]["privacyStatus"] = privacy_status
        
        # Execute the update
        youtube.videos().update(
            part="status",
            body=video_response["items"][0]
        ).execute()
        
        return True
    
    except Exception as e:
        logger.error(f"Error updating YouTube video privacy: {str(e)}")
        raise
