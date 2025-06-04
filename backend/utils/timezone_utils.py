"""
Timezone utility functions for the Estuary application.
"""
from django.utils import timezone
import pytz
from datetime import datetime


def get_user_timezone(user):
    """
    Get the timezone object for a user.
    
    Args:
        user: User instance
        
    Returns:
        pytz.timezone: The user's timezone object
    """
    try:
        return pytz.timezone(user.timezone)
    except (pytz.exceptions.UnknownTimeZoneError, AttributeError):
        return pytz.UTC


def convert_to_user_timezone(dt, user):
    """
    Convert a datetime object to the user's timezone.
    
    Args:
        dt: datetime object (timezone-aware)
        user: User instance
        
    Returns:
        datetime: The datetime converted to the user's timezone
    """
    if not dt:
        return None
        
    if not timezone.is_aware(dt):
        dt = timezone.make_aware(dt)
        
    user_tz = get_user_timezone(user)
    return dt.astimezone(user_tz)


def convert_from_user_timezone(dt, user):
    """
    Convert a datetime from user's timezone to UTC.
    
    Args:
        dt: datetime object (assumed to be in user's timezone)
        user: User instance
        
    Returns:
        datetime: The datetime converted to UTC
    """
    if not dt:
        return None
        
    user_tz = get_user_timezone(user)
    
    # If datetime is naive, assume it's in user's timezone
    if not timezone.is_aware(dt):
        dt = user_tz.localize(dt)
        
    # Convert to UTC
    return dt.astimezone(pytz.UTC)


def get_timezone_choices():
    """
    Get a list of timezone choices for API.
    
    Returns:
        list: A list of dicts with timezone info
    """
    common_timezones = [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Anchorage',
        'America/Honolulu',
        'America/Toronto',
        'America/Vancouver',
        'America/Mexico_City',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Moscow',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Singapore',
        'Asia/Dubai',
        'Australia/Sydney',
        'Australia/Perth',
        'Pacific/Auckland',
    ]
    
    # Create a list of timezone info dicts
    choices = []
    for tz_name in common_timezones:
        try:
            tz = pytz.timezone(tz_name)
            now = datetime.now(tz)
            offset = now.strftime('%z')
            offset_hours = int(offset[:3])
            offset_minutes = int(offset[3:])
            
            choices.append({
                'value': tz_name,
                'label': f"{tz_name} (UTC{offset[:3]}:{offset[3:]})",
                'offset': {
                    'hours': offset_hours,
                    'minutes': offset_minutes
                }
            })
        except pytz.exceptions.UnknownTimeZoneError:
            continue
            
    return choices
