#!/usr/bin/env python
"""Create a room for service session 32"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from services.models import ServiceSession
from rooms.models import Room
from django.utils import timezone

# Get the service session
try:
    session = ServiceSession.objects.get(id=32)
    print(f"Found session: {session.title or 'Untitled'} (ID: {session.id})")
    
    # Check if it already has a room
    if session.room:
        print(f"Session already has a room: {session.room.room_id}")
    else:
        # Create a room for this session
        room = Room.objects.create(
            name=f"{session.service.name} - {session.title or 'Session'}",
            room_type='service_session',
            entity_type='service_session',
            entity_id=str(session.id),
            max_participants=session.max_participants or session.service.max_participants or 50,
            is_active=True,
            starts_at=session.start_time,
            ends_at=session.end_time,
            created_by=session.service.primary_practitioner.user if session.service.primary_practitioner else None
        )
        
        # Associate the room with the session
        session.room = room
        session.save()
        
        print(f"Created room: {room.room_id}")
        print(f"Room URL will be: /room/session/{session.id}/lobby")
        
except ServiceSession.DoesNotExist:
    print("Service session with ID 32 not found!")
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()