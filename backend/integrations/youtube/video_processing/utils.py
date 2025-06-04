import os
import uuid
import tempfile
import subprocess
import logging
from django.conf import settings
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to the assets directory where we'll store branding elements
ASSETS_DIR = Path(settings.BASE_DIR) / 'apps' / 'integrations' / 'youtube' / 'video_processing' / 'assets'


def ensure_ffmpeg_installed():
    """
    Check if FFmpeg is installed on the system.
    
    Returns:
        bool: True if FFmpeg is installed, False otherwise
    """
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE, 
                               text=True, 
                               check=False)
        return result.returncode == 0
    except FileNotFoundError:
        logger.error("FFmpeg is not installed on the system")
        return False


def add_logo_overlay(input_video_path, output_video_path=None, logo_path=None, position='bottom-right', opacity=0.7):
    """
    Add a logo overlay to a video using FFmpeg.
    
    Args:
        input_video_path (str): Path to the input video file
        output_video_path (str, optional): Path to save the output video. If None, a temporary file is created.
        logo_path (str, optional): Path to the logo image file. If None, the default logo is used.
        position (str): Position of the logo. Options: 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
        opacity (float): Opacity of the logo (0.0 to 1.0)
        
    Returns:
        str: Path to the processed video file
    """
    if not ensure_ffmpeg_installed():
        raise Exception("FFmpeg is not installed. Please install FFmpeg to process videos.")
    
    # Use default logo if not provided
    if logo_path is None:
        logo_path = os.path.join(ASSETS_DIR, 'logo.png')
        if not os.path.exists(logo_path):
            raise FileNotFoundError(f"Default logo not found at {logo_path}")
    
    # Create output path if not provided
    if output_video_path is None:
        output_dir = tempfile.gettempdir()
        output_video_path = os.path.join(output_dir, f"{uuid.uuid4().hex}_processed.mp4")
    
    # Define position coordinates
    position_map = {
        'top-left': '10:10',
        'top-right': 'main_w-overlay_w-10:10',
        'bottom-left': '10:main_h-overlay_h-10',
        'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10',
        'center': '(main_w-overlay_w)/2:(main_h-overlay_h)/2'
    }
    
    position_coords = position_map.get(position, position_map['bottom-right'])
    
    # Build the FFmpeg command
    ffmpeg_cmd = [
        'ffmpeg',
        '-i', input_video_path,
        '-i', logo_path,
        '-filter_complex', f'overlay={position_coords}:alpha={opacity}',
        '-codec:a', 'copy',
        output_video_path
    ]
    
    try:
        # Run the FFmpeg command
        logger.info(f"Running FFmpeg command: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(ffmpeg_cmd, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE, 
                               text=True, 
                               check=True)
        
        logger.info(f"Video processed successfully: {output_video_path}")
        return output_video_path
    
    except subprocess.CalledProcessError as e:
        logger.error(f"Error processing video: {e.stderr}")
        raise Exception(f"Error processing video with FFmpeg: {e.stderr}")


def add_intro_outro(input_video_path, output_video_path=None, intro_path=None, outro_path=None):
    """
    Add intro and outro clips to a video using FFmpeg.
    
    Args:
        input_video_path (str): Path to the input video file
        output_video_path (str, optional): Path to save the output video. If None, a temporary file is created.
        intro_path (str, optional): Path to the intro video file. If None, the default intro is used.
        outro_path (str, optional): Path to the outro video file. If None, the default outro is used.
        
    Returns:
        str: Path to the processed video file
    """
    if not ensure_ffmpeg_installed():
        raise Exception("FFmpeg is not installed. Please install FFmpeg to process videos.")
    
    # Use default intro/outro if not provided
    if intro_path is None:
        intro_path = os.path.join(ASSETS_DIR, 'intro.mp4')
        if not os.path.exists(intro_path):
            logger.warning(f"Default intro not found at {intro_path}, skipping intro")
            intro_path = None
    
    if outro_path is None:
        outro_path = os.path.join(ASSETS_DIR, 'outro.mp4')
        if not os.path.exists(outro_path):
            logger.warning(f"Default outro not found at {outro_path}, skipping outro")
            outro_path = None
    
    # If neither intro nor outro exists, return the original video
    if intro_path is None and outro_path is None:
        logger.warning("No intro or outro found, returning original video")
        return input_video_path
    
    # Create output path if not provided
    if output_video_path is None:
        output_dir = tempfile.gettempdir()
        output_video_path = os.path.join(output_dir, f"{uuid.uuid4().hex}_processed.mp4")
    
    # Create a temporary file list for concatenation
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as f:
        if intro_path:
            f.write(f"file '{intro_path}'\n")
        f.write(f"file '{input_video_path}'\n")
        if outro_path:
            f.write(f"file '{outro_path}'\n")
        concat_list_path = f.name
    
    try:
        # Build the FFmpeg command for concatenation
        ffmpeg_cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_path,
            '-c', 'copy',
            output_video_path
        ]
        
        # Run the FFmpeg command
        logger.info(f"Running FFmpeg command: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(ffmpeg_cmd, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE, 
                               text=True, 
                               check=True)
        
        logger.info(f"Video processed successfully: {output_video_path}")
        return output_video_path
    
    except subprocess.CalledProcessError as e:
        logger.error(f"Error processing video: {e.stderr}")
        raise Exception(f"Error processing video with FFmpeg: {e.stderr}")
    
    finally:
        # Clean up temp files
        if os.path.exists(concat_list_path):
            os.unlink(concat_list_path)


def process_video(input_video_path, output_video_path=None, add_logo=True, add_intro=True, add_outro=True, 
                 logo_path=None, intro_path=None, outro_path=None, logo_position='bottom-right', logo_opacity=0.7):
    """
    Process a video with branding elements.
    
    Args:
        input_video_path (str): Path to the input video file
        output_video_path (str, optional): Path to save the final output video
        add_logo (bool): Whether to add a logo overlay
        add_intro (bool): Whether to add an intro clip
        add_outro (bool): Whether to add an outro clip
        logo_path (str, optional): Path to the logo image file
        intro_path (str, optional): Path to the intro video file
        outro_path (str, optional): Path to the outro video file
        logo_position (str): Position of the logo
        logo_opacity (float): Opacity of the logo
        
    Returns:
        str: Path to the processed video file
    """
    # Create temporary paths for intermediate files
    temp_dir = tempfile.gettempdir()
    temp_path_1 = os.path.join(temp_dir, f"{uuid.uuid4().hex}_temp1.mp4")
    
    try:
        current_video_path = input_video_path
        
        # Step 1: Add logo if requested
        if add_logo:
            current_video_path = add_logo_overlay(
                current_video_path, 
                output_video_path=temp_path_1,
                logo_path=logo_path,
                position=logo_position,
                opacity=logo_opacity
            )
        
        # Step 2: Add intro/outro if requested
        if add_intro or add_outro:
            # If we're adding intro/outro to the original video
            if not add_logo:
                intro_outro_input = input_video_path
            # If we're adding intro/outro to the logo-processed video
            else:
                intro_outro_input = current_video_path
            
            # Determine output path
            if output_video_path:
                final_output = output_video_path
            else:
                final_output = os.path.join(temp_dir, f"{uuid.uuid4().hex}_final.mp4")
            
            current_video_path = add_intro_outro(
                intro_outro_input,
                output_video_path=final_output,
                intro_path=intro_path if add_intro else None,
                outro_path=outro_path if add_outro else None
            )
        
        # If no processing was done but an output path was specified, copy the file
        if current_video_path == input_video_path and output_video_path:
            import shutil
            shutil.copy2(input_video_path, output_video_path)
            current_video_path = output_video_path
        
        return current_video_path
    
    finally:
        # Clean up temporary files
        if os.path.exists(temp_path_1) and temp_path_1 != current_video_path:
            os.unlink(temp_path_1)
