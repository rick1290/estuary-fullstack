import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


def upload_file_to_r2(file, directory='uploads'):
    """
    Upload a file to Cloudflare R2 storage.
    
    Args:
        file: The file object to upload
        directory: The directory within the bucket to store the file (default: 'uploads')
        
    Returns:
        str: The URL of the uploaded file
    """
    # Generate a unique filename to avoid collisions
    filename = f"{uuid.uuid4().hex}_{file.name}"
    
    # Create the full path including the directory
    path = os.path.join(directory, filename)
    
    # Save the file to R2 storage
    saved_path = default_storage.save(path, ContentFile(file.read()))
    
    # Return the URL to the file
    return default_storage.url(saved_path)


def upload_practitioner_profile_image(image_file, practitioner_id):
    """
    Upload a practitioner profile image to Cloudflare R2 storage.
    
    Args:
        image_file: The image file to upload
        practitioner_id: The ID of the practitioner
        
    Returns:
        str: The URL of the uploaded image
    """
    # Create a directory structure for practitioner profile images
    directory = f"practitioners/{practitioner_id}/profile"
    
    # Upload the image to R2
    return upload_file_to_r2(image_file, directory)


def upload_practitioner_profile_video(video_file, practitioner_id, max_size_mb=100):
    """
    Upload a practitioner profile video to Cloudflare R2 storage with size limit.
    
    Args:
        video_file: The video file to upload
        practitioner_id: The ID of the practitioner
        max_size_mb: Maximum file size in megabytes (default: 100MB)
        
    Returns:
        str: The URL of the uploaded video
        
    Raises:
        ValueError: If the file size exceeds the maximum allowed size
    """
    # Check file size (convert MB to bytes)
    max_size_bytes = max_size_mb * 1024 * 1024
    if video_file.size > max_size_bytes:
        raise ValueError(f"Video file size exceeds the maximum allowed size of {max_size_mb}MB")
    
    # Create a directory structure for practitioner profile videos
    directory = f"practitioners/{practitioner_id}/videos"
    
    # Upload the video to R2
    return upload_file_to_r2(video_file, directory)


def delete_file_from_r2(file_path):
    """
    Delete a file from Cloudflare R2 storage.
    
    Args:
        file_path: The path of the file to delete
        
    Returns:
        bool: True if the file was deleted successfully, False otherwise
    """
    try:
        default_storage.delete(file_path)
        return True
    except Exception:
        return False