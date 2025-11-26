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


def get_timezone_choices(include_all=False):
    """
    Get a list of timezone choices for API.

    Args:
        include_all: If True, return all pytz common timezones.
                     If False, return curated list of most common ones.

    Returns:
        list: A list of dicts with timezone info, sorted by offset
    """
    if include_all:
        # Use pytz.common_timezones for comprehensive list
        timezone_list = pytz.common_timezones
    else:
        # Curated list of most commonly used timezones
        timezone_list = [
            # UTC
            'UTC',
            # United States
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Phoenix',
            'America/Anchorage',
            'Pacific/Honolulu',
            # Canada
            'America/Toronto',
            'America/Vancouver',
            'America/Edmonton',
            'America/Winnipeg',
            'America/Halifax',
            # Mexico & Central America
            'America/Mexico_City',
            'America/Cancun',
            'America/Costa_Rica',
            # South America
            'America/Sao_Paulo',
            'America/Buenos_Aires',
            'America/Santiago',
            'America/Bogota',
            'America/Lima',
            # UK & Ireland
            'Europe/London',
            'Europe/Dublin',
            # Western Europe
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Amsterdam',
            'Europe/Brussels',
            'Europe/Madrid',
            'Europe/Rome',
            'Europe/Zurich',
            'Europe/Vienna',
            # Eastern Europe
            'Europe/Warsaw',
            'Europe/Prague',
            'Europe/Budapest',
            'Europe/Bucharest',
            'Europe/Athens',
            'Europe/Helsinki',
            'Europe/Stockholm',
            'Europe/Oslo',
            'Europe/Copenhagen',
            # Russia & CIS
            'Europe/Moscow',
            'Europe/Kiev',
            # Middle East
            'Asia/Dubai',
            'Asia/Jerusalem',
            'Asia/Tehran',
            'Asia/Riyadh',
            'Asia/Qatar',
            # South Asia
            'Asia/Kolkata',
            'Asia/Karachi',
            'Asia/Dhaka',
            'Asia/Colombo',
            # Southeast Asia
            'Asia/Bangkok',
            'Asia/Singapore',
            'Asia/Jakarta',
            'Asia/Manila',
            'Asia/Ho_Chi_Minh',
            'Asia/Kuala_Lumpur',
            # East Asia
            'Asia/Tokyo',
            'Asia/Seoul',
            'Asia/Shanghai',
            'Asia/Hong_Kong',
            'Asia/Taipei',
            # Australia & New Zealand
            'Australia/Sydney',
            'Australia/Melbourne',
            'Australia/Brisbane',
            'Australia/Perth',
            'Australia/Adelaide',
            'Pacific/Auckland',
            'Pacific/Fiji',
            # Africa
            'Africa/Johannesburg',
            'Africa/Cairo',
            'Africa/Lagos',
            'Africa/Nairobi',
            'Africa/Casablanca',
        ]

    # Create a list of timezone info dicts
    choices = []
    for tz_name in timezone_list:
        try:
            tz = pytz.timezone(tz_name)
            now = datetime.now(tz)
            offset = now.strftime('%z')
            offset_hours = int(offset[:3])
            offset_minutes = int(offset[0] + offset[3:]) if offset[3:] != '00' else 0
            total_offset_minutes = offset_hours * 60 + offset_minutes

            # Format offset string nicely
            # offset is like '+0100' or '-0500', we want 'UTC+01:00' or 'UTC-05:00'
            offset_str = f"UTC{offset[:3]}:{offset[3:]}"

            # Create a friendly label from timezone name
            # e.g., "America/New_York" -> "New York"
            friendly_name = tz_name.split('/')[-1].replace('_', ' ')
            region = tz_name.split('/')[0] if '/' in tz_name else ''

            choices.append({
                'value': tz_name,
                'label': f"{friendly_name} ({offset_str})",
                'full_label': f"{tz_name} ({offset_str})",
                'region': region,
                'offset_str': offset_str,
                'offset_minutes': total_offset_minutes,
            })
        except pytz.exceptions.UnknownTimeZoneError:
            continue

    # Sort by offset (UTC first, then west to east)
    choices.sort(key=lambda x: (x['offset_minutes'], x['value']))

    return choices
