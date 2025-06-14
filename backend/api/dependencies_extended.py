"""
Extended dependencies for specific use cases
"""
from typing import Annotated
from fastapi import Depends
from django.db import transaction
from asgiref.sync import sync_to_async

from api.dependencies import get_current_user
from practitioners.models import Practitioner
from users.models import User


@sync_to_async
def get_or_create_practitioner_sync(user: User) -> Practitioner:
    """Get or create practitioner profile for user"""
    with transaction.atomic():
        try:
            # Try to get existing practitioner with user pre-loaded
            practitioner = Practitioner.objects.select_related('user').get(user=user)
        except Practitioner.DoesNotExist:
            # Create new practitioner
            practitioner = Practitioner.objects.create(
                user=user,
                practitioner_status='active',
                is_verified=True,  # Auto-verify for testing - in production this would be False
                display_name=f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
                # Set minimal defaults - user can complete profile later
            )
            # Reload with select_related
            practitioner = Practitioner.objects.select_related('user').get(id=practitioner.id)
        
        return practitioner


async def get_or_create_practitioner(
    current_user: Annotated[User, Depends(get_current_user)]
) -> Practitioner:
    """
    Get existing practitioner profile or create one if it doesn't exist.
    This is used for endpoints where we want to automatically create a 
    practitioner profile when needed (e.g., subscription purchase).
    """
    return await get_or_create_practitioner_sync(current_user)