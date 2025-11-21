"""
Room views for DRF API.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rooms.models import Room, RoomParticipant, RoomToken, RoomRecording
from rooms.livekit.tokens import generate_room_token
from rooms.livekit.client import LiveKitClient
from rooms.services.recording_service import RecordingService
from .serializers import (
    RoomSerializer, RoomDetailSerializer, RoomTokenRequestSerializer,
    RoomTokenResponseSerializer, RoomParticipantSerializer,
    RoomRecordingSerializer, CreateRoomSerializer,
    StartRecordingSerializer, RecordingResponseSerializer
)
from bookings.models import Booking
from services.models import ServiceSession
import logging

logger = logging.getLogger(__name__)


class RoomViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Room operations.
    """
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'public_uuid'
    
    def get_queryset(self):
        """
        Get rooms accessible to the current user.
        """
        user = self.request.user

        # Base queryset with all needed relations
        # NOTE: booking FK removed - access bookings via service_session.bookings
        queryset = Room.objects.select_related(
            'created_by',
            'service_session',
            'service_session__service',
            'service_session__service__primary_practitioner',
            'service_session__service__primary_practitioner__user'
        ).prefetch_related('participants', 'service_session__bookings')

        # Filter based on user role and relationships
        if user.is_staff:
            # Staff can see all rooms
            return queryset

        # Users can see rooms they're involved in
        # All access now through service_session
        return queryset.filter(
            Q(created_by=user) |  # Rooms they created
            Q(service_session__service__primary_practitioner__user=user) |  # Their service session rooms
            Q(service_session__bookings__user=user)  # Rooms for sessions they're booked in
        ).distinct()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RoomDetailSerializer
        return RoomSerializer
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Get upcoming rooms for the current user.
        """
        upcoming_rooms = self.get_queryset().filter(
            scheduled_start__gt=timezone.now(),
            status__in=['pending', 'active']
        ).order_by('scheduled_start')[:10]
        
        serializer = self.get_serializer(upcoming_rooms, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get currently active rooms for the current user.
        """
        active_rooms = self.get_queryset().filter(
            status__in=['active', 'in_use']
        )
        
        serializer = self.get_serializer(active_rooms, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def check_access(self, request, public_uuid=None):
        """
        Check if the current user has access to this room.
        Returns access permissions and room details.
        """
        room = self.get_object()
        user = request.user
        
        # Initialize response data
        response_data = {
            'can_join': False,
            'role': 'viewer',
            'reason': None,
            'room': {
                'id': room.id,
                'public_uuid': room.public_uuid,
                'livekit_room_name': room.livekit_room_name,
                'status': room.status,
                'room_type': room.room_type,
                'recording_status': room.recording_status,
                'recording_enabled': room.recording_enabled,
            }
        }
        
        # Check if user is the room creator
        if room.created_by == user:
            response_data.update({
                'can_join': True,
                'role': 'host',
            })
            return Response(response_data)

        # All room access is now through service_session
        # (booking FK was removed from Room)
        if room.service_session:
            session = room.service_session
            service = session.service
            
            # Check if user is the practitioner
            is_practitioner = (
                service.primary_practitioner and 
                service.primary_practitioner.user == user
            )
            
            if is_practitioner:
                response_data.update({
                    'can_join': True,
                    'role': 'host',
                    'service_session': {
                        'id': session.id,
                        'start_time': session.start_time,
                        'end_time': session.end_time,
                    }
                })
                return Response(response_data)
            
            # Check for user bookings
            # For workshops: booking.service_session matches this session
            # For courses: booking.service matches this session's service
            from bookings.models import Booking
            
            user_has_access = False
            
            # Check workshop bookings (direct service_session relationship)
            if Booking.objects.filter(
                user=user,
                service_session=session,
                status='confirmed'
            ).exists():
                user_has_access = True
            
            # Check course bookings (service relationship)
            elif service.service_type == 'course' and Booking.objects.filter(
                user=user,
                service=service,
                status='confirmed'
            ).exists():
                user_has_access = True
            
            if user_has_access:
                response_data.update({
                    'can_join': True,
                    'role': 'participant',
                    'service_session': {
                        'id': session.id,
                        'start_time': session.start_time,
                        'end_time': session.end_time,
                    }
                })
                return Response(response_data)
            
            response_data['reason'] = 'No confirmed booking for this session'
            return Response(response_data)
        
        # Default: no access
        response_data['reason'] = 'No valid access to this room'
        return Response(response_data)
    
    @action(detail=True, methods=['post'])
    def get_token(self, request, public_uuid=None):
        """
        Get a LiveKit access token for joining a room.
        """
        room = self.get_object()
        
        # Validate request
        serializer = RoomTokenRequestSerializer(
            data={'room_id': room.public_uuid, **request.data},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # Determine user's role in this room
        user = request.user
        role = 'participant'  # Default role
        
        # Check if user is the practitioner/host
        # All access now through service_session (booking FK removed from Room)
        if room.service_session and room.service_session.service.primary_practitioner and room.service_session.service.primary_practitioner.user == user:
            role = 'host'
        elif room.created_by == user:
            role = 'host'
        
        # Use custom name if provided, otherwise user's full name
        participant_name = serializer.validated_data.get(
            'participant_name',
            user.get_full_name()
        )

        # Generate identity (unique identifier for LiveKit)
        # Just use user ID - simpler and more robust than parsing email
        identity = str(user.id)

        # Generate token with 4-hour expiry
        token_info = generate_room_token(
            room_name=room.livekit_room_name,
            participant_name=participant_name,
            participant_identity=identity,
            is_host=(role == 'host'),
            ttl=14400  # 4 hours
        )
        
        # Create or update RoomParticipant
        participant, created = RoomParticipant.objects.update_or_create(
            room=room,
            user=user,
            defaults={
                'identity': identity,
                'role': role,
                'permissions': {}  # Can be expanded later
            }
        )
        
        # Calculate expiry time
        token_expiry = timezone.now() + timezone.timedelta(hours=4)
        
        # Create RoomToken record
        room_token = RoomToken.objects.create(
            room=room,
            participant=participant,
            user=user,
            token=token_info['token'],
            identity=identity,
            role=role,
            permissions={},  # Can be expanded later
            expires_at=token_expiry,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Update room status if needed
        if room.status == 'pending' and room.can_start:
            room.status = 'active'
            room.save(update_fields=['status'])
        
        # Prepare response
        response_data = {
            'token': token_info['token'],
            'room_name': room.livekit_room_name,
            'participant_identity': identity,
            'expires_at': token_expiry,
            'permissions': {},
            'join_url': room.get_join_url(participant_name)
        }
        
        response_serializer = RoomTokenResponseSerializer(response_data)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def start_recording(self, request, public_uuid=None):
        """
        Start recording a room (host only).
        """
        room = self.get_object()
        user = request.user

        # Check permissions - only host can start recording
        # All access now through service_session (booking FK removed from Room)
        is_host = False
        if room.service_session and room.service_session.service.primary_practitioner and room.service_session.service.primary_practitioner.user == user:
            is_host = True
        elif room.created_by == user:
            is_host = True

        if not is_host:
            return Response(
                {'error': 'Only the host can start recording.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not room.recording_enabled:
            return Response(
                {'error': 'Recording is not enabled for this room.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Note: We're not checking active_participants in DB because participant_joined
        # webhooks may not have processed yet. LiveKit will fail with "Start signal not received"
        # if the room is actually empty, so we let LiveKit handle that validation.

        # Validate request data
        serializer = StartRecordingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Start recording via RecordingService
            recording_service = RecordingService()
            recording = recording_service.start_recording(
                room=room,
                layout=serializer.validated_data.get('layout', 'speaker'),
                file_format=serializer.validated_data.get('file_format', 'mp4'),
                audio_only=serializer.validated_data.get('audio_only', False)
            )

            response_data = {
                'recording_id': recording.recording_id,
                'status': recording.status,
                'message': 'Recording started successfully.',
                'recording': RoomRecordingSerializer(recording).data
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            logger.warning(f"Invalid recording request for room {room.id}: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Failed to start recording for room {room.id}: {str(e)}")
            return Response(
                {'error': 'Failed to start recording. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def stop_recording(self, request, public_uuid=None):
        """
        Stop recording a room (host only).
        """
        room = self.get_object()
        user = request.user

        # Check permissions - only host can stop recording
        # All access now through service_session (booking FK removed from Room)
        is_host = False
        if room.service_session and room.service_session.service.primary_practitioner and room.service_session.service.primary_practitioner.user == user:
            is_host = True
        elif room.created_by == user:
            is_host = True

        if not is_host:
            return Response(
                {'error': 'Only the host can stop recording.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Stop recording via RecordingService
            recording_service = RecordingService()
            recording = recording_service.stop_recording(room=room)

            if not recording:
                return Response(
                    {'error': 'No active recording to stop.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            response_data = {
                'recording_id': recording.recording_id,
                'status': recording.status,
                'message': 'Recording stopped successfully.',
                'recording': RoomRecordingSerializer(recording).data
            }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Failed to stop recording for room {room.id}: {str(e)}")
            return Response(
                {'error': 'Failed to stop recording. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def participants(self, request, public_uuid=None):
        """
        Get current participants in a room.
        """
        room = self.get_object()
        
        # Only show participants if user is in the room or is staff
        user = request.user
        can_view = user.is_staff or room.created_by == user

        if not can_view:
            # Check if user is a participant via service_session
            # (booking FK removed from Room)
            if room.service_session:
                can_view = (
                    (room.service_session.service.primary_practitioner and
                     room.service_session.service.primary_practitioner.user == user) or
                    room.service_session.bookings.filter(user=user).exists()
                )
        
        if not can_view:
            return Response(
                {'error': 'You do not have permission to view participants.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        participants = room.participants.filter(left_at__isnull=True)
        serializer = RoomParticipantSerializer(participants, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def recordings(self, request, public_uuid=None):
        """
        Get recordings for a room.
        """
        room = self.get_object()
        recordings = room.recordings.filter(is_processed=True)
        serializer = RoomRecordingSerializer(recordings, many=True)
        return Response(serializer.data)


class BookingRoomViewSet(viewsets.ViewSet):
    """
    ViewSet for accessing rooms via booking ID.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='(?P<booking_id>[^/.]+)/room')
    def get_room(self, request, booking_id=None):
        """
        Get room details for a booking.
        """
        booking = get_object_or_404(
            Booking.objects.select_related('livekit_room'),
            public_uuid=booking_id
        )
        
        # Check permissions
        if not (
            request.user == booking.user or
            request.user == booking.service.primary_practitioner.user or
            request.user.is_staff
        ):
            return Response(
                {'error': 'You do not have permission to access this room.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.livekit_room:
            # Check if this is a group session booking
            if booking.service_session and booking.service_session.livekit_room:
                room = booking.service_session.livekit_room
            else:
                return Response(
                    {'error': 'No room associated with this booking.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            room = booking.livekit_room
        
        serializer = RoomDetailSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='(?P<booking_id>[^/.]+)/join')
    def join_room(self, request, booking_id=None):
        """
        Get a token to join the room for a booking.
        """
        booking = get_object_or_404(
            Booking.objects.select_related('livekit_room', 'service_session__livekit_room'),
            public_uuid=booking_id
        )
        
        # Check permissions
        if not (
            request.user == booking.user or
            request.user == booking.service.primary_practitioner.user or
            request.user.is_staff
        ):
            return Response(
                {'error': 'You do not have permission to join this room.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the appropriate room
        if booking.livekit_room:
            room = booking.livekit_room
        elif booking.service_session and booking.service_session.livekit_room:
            room = booking.service_session.livekit_room
        else:
            return Response(
                {'error': 'No room associated with this booking.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use RoomViewSet's get_token logic
        room_viewset = RoomViewSet()
        room_viewset.request = request
        room_viewset.kwargs = {'public_uuid': room.public_uuid}
        return room_viewset.get_token(request, public_uuid=room.public_uuid)