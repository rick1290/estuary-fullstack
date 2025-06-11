"""
Media API utility functions
"""
import os
import hashlib
from typing import Tuple, Optional
from PIL import Image
from io import BytesIO
import magic


def get_image_dimensions(file) -> Optional[Tuple[int, int]]:
    """
    Get dimensions of an image file.
    
    Args:
        file: File-like object
        
    Returns:
        Tuple of (width, height) or None if not an image
    """
    try:
        file.seek(0)
        image = Image.open(file)
        dimensions = image.size
        file.seek(0)
        return dimensions
    except Exception:
        return None


def calculate_file_hash(file, algorithm='sha256') -> str:
    """
    Calculate hash of a file.
    
    Args:
        file: File-like object
        algorithm: Hash algorithm to use
        
    Returns:
        Hex digest of the file hash
    """
    hasher = hashlib.new(algorithm)
    file.seek(0)
    
    for chunk in iter(lambda: file.read(4096), b''):
        hasher.update(chunk)
    
    file.seek(0)
    return hasher.hexdigest()


def get_video_duration(file) -> Optional[float]:
    """
    Get duration of a video file in seconds.
    
    This is a placeholder - actual implementation would use
    ffprobe or similar tool.
    
    Args:
        file: File-like object
        
    Returns:
        Duration in seconds or None
    """
    # TODO: Implement using ffprobe or pymediainfo
    return None


def validate_image_content(file) -> bool:
    """
    Validate that file contains actual image data.
    
    Args:
        file: File-like object
        
    Returns:
        True if valid image, False otherwise
    """
    try:
        file.seek(0)
        image = Image.open(file)
        image.verify()
        file.seek(0)
        return True
    except Exception:
        return False


def get_safe_filename(filename: str) -> str:
    """
    Generate a safe filename by removing special characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    # Get name and extension
    name, ext = os.path.splitext(filename)
    
    # Remove special characters from name
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip()
    
    # Replace spaces with underscores
    safe_name = safe_name.replace(' ', '_')
    
    # Ensure name is not empty
    if not safe_name:
        safe_name = 'file'
    
    # Limit length
    safe_name = safe_name[:100]
    
    return f"{safe_name}{ext.lower()}"


def generate_thumbnail_dimensions(
    original_width: int, 
    original_height: int, 
    max_size: int = 300
) -> Tuple[int, int]:
    """
    Calculate thumbnail dimensions maintaining aspect ratio.
    
    Args:
        original_width: Original image width
        original_height: Original image height
        max_size: Maximum dimension for thumbnail
        
    Returns:
        Tuple of (width, height) for thumbnail
    """
    # Calculate aspect ratio
    aspect_ratio = original_width / original_height
    
    # Determine new dimensions
    if original_width > original_height:
        # Landscape
        new_width = min(original_width, max_size)
        new_height = int(new_width / aspect_ratio)
    else:
        # Portrait or square
        new_height = min(original_height, max_size)
        new_width = int(new_height * aspect_ratio)
    
    return (new_width, new_height)


def estimate_processing_time(file_size: int, media_type: str) -> int:
    """
    Estimate processing time in seconds based on file size and type.
    
    Args:
        file_size: File size in bytes
        media_type: Type of media (image, video, etc.)
        
    Returns:
        Estimated processing time in seconds
    """
    # Convert to MB
    size_mb = file_size / (1024 * 1024)
    
    # Base estimates (very rough)
    if media_type == 'image':
        # ~1 second per MB for images
        return max(1, int(size_mb))
    elif media_type == 'video':
        # ~10 seconds per MB for videos
        return max(10, int(size_mb * 10))
    else:
        # Default estimate
        return 5


def get_mime_category(mime_type: str) -> str:
    """
    Get general category from MIME type.
    
    Args:
        mime_type: MIME type string
        
    Returns:
        Category (image, video, audio, document, other)
    """
    if mime_type.startswith('image/'):
        return 'image'
    elif mime_type.startswith('video/'):
        return 'video'
    elif mime_type.startswith('audio/'):
        return 'audio'
    elif mime_type in ['application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'text/plain']:
        return 'document'
    else:
        return 'other'