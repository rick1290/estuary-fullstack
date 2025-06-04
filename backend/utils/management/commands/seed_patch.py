"""
Monkey patch for django-seed to work with newer Django versions.
"""
from django.utils import timezone

# Original function from django_seed/guessers.py
def _timezone_format(value):
    """
    Patch for django-seed's _timezone_format function to work with newer Django versions
    that don't accept the is_dst parameter.
    """
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value, timezone.get_current_timezone())

# Apply the monkey patch to django_seed
def apply_patch():
    """Apply the monkey patch to django_seed."""
    import django_seed.guessers
    django_seed.guessers._timezone_format = _timezone_format
    print("✅ Django-seed patch applied successfully")
