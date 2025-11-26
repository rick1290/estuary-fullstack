"""
Booking-related activities for Temporal workflows.
These are the atomic operations that workflows orchestrate.
"""
from temporalio import activity
from typing import Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from django.db import transaction

# Import shared activities
from workflows.shared.activities import send_email, send_sms, log_event

logger = logging.getLogger(__name__)


@activity.defn
async def validate_booking(booking_id: str) -> Optional[Dict[str, Any]]:
    """
    Validate a booking exists and return its data.
    
    Args:
        booking_id: ID of the booking to validate
        
    Returns:
        Dict with booking data or None if invalid
    """
    try:
        from bookings.models import Booking
        
        booking = Booking.objects.select_related(
            'user', 
            'practitioner', 
            'service'
        ).get(id=booking_id)
        
        if booking.status != 'confirmed':
            logger.warning(f"Booking {booking_id} is not confirmed. Status: {booking.status}")
            return None
        
        # Note: start_time and end_time are now on ServiceSession, use accessor methods
        start_time = booking.get_start_time()
        end_time = booking.get_end_time()

        return {
            'id': str(booking.id),
            'start_time': start_time.isoformat() if start_time else None,
            'end_time': end_time.isoformat() if end_time else None,
            'duration_minutes': booking.duration_minutes,
            'service_name': booking.service.name,
            'service_type': booking.service.service_type.code,
            'client_name': booking.user.full_name,
            'client_email': booking.user.email,
            'client_phone': booking.user.phone_number,
            'practitioner_name': booking.practitioner.user.full_name,
            'practitioner_email': booking.practitioner.user.email,
            'location_type': booking.service.location_type if booking.service else None,
            'price_cents': booking.credits_allocated,
        }
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error validating booking {booking_id}: {e}")
        raise


@activity.defn
async def send_booking_confirmation(booking_id: str) -> bool:
    """Send booking confirmation to client and practitioner."""
    try:
        from bookings.models import Booking
        
        booking = Booking.objects.select_related(
            'user', 'practitioner', 'service'
        ).get(id=booking_id)
        
        # Send to client
        await send_email(
            to_email=booking.user.email,
            template_id='booking_confirmation_client',
            context={
                'booking': booking,
                'client_name': booking.user.first_name,
                'service_name': booking.service.name,
                'start_time': booking.get_start_time(),
                'practitioner_name': booking.practitioner.display_name,
            }
        )

        # Send to practitioner
        await send_email(
            to_email=booking.practitioner.user.email,
            template_id='booking_confirmation_practitioner',
            context={
                'booking': booking,
                'practitioner_name': booking.practitioner.user.first_name,
                'client_name': booking.user.full_name,
                'service_name': booking.service.name,
                'start_time': booking.get_start_time(),
            }
        )
        
        # Log event
        await log_event(
            event_type='booking.confirmation_sent',
            entity_type='booking',
            entity_id=str(booking_id),
            data={'timestamp': datetime.utcnow().isoformat()}
        )
        
        return True
    except Exception as e:
        logger.error(f"Error sending booking confirmation: {e}")
        raise


@activity.defn
async def send_booking_reminder(booking_id: str) -> bool:
    """Send booking reminder 48 hours before session."""
    try:
        from bookings.models import Booking
        
        booking = Booking.objects.select_related(
            'user', 'practitioner', 'service', 'room'
        ).get(id=booking_id)
        
        # Prepare context
        context = {
            'booking': booking,
            'service_name': booking.service.name,
            'start_time': booking.get_start_time(),
            'practitioner_name': booking.practitioner.display_name,
        }
        
        # Add room info if available
        if hasattr(booking, 'room') and booking.room:
            context['has_room'] = True
            if booking.room.dial_in_number:
                context['dial_in_number'] = booking.room.dial_in_number
                context['dial_in_pin'] = booking.room.dial_in_pin
        
        # Send email reminder
        await send_email(
            to_email=booking.user.email,
            template_id='booking_reminder_48h',
            context=context
        )
        
        # Send SMS if phone available
        if booking.user.phone_number:
            message = f"Reminder: {booking.service.name} with {booking.practitioner.display_name} on {booking.start_time.strftime('%A, %B %d at %I:%M %p')}"
            await send_sms(
                to_phone=booking.user.phone_number,
                message=message
            )
        
        return True
    except Exception as e:
        logger.error(f"Error sending booking reminder: {e}")
        raise


@activity.defn
async def create_room_for_booking(booking_id: str) -> Dict[str, Any]:
    """Create LiveKit room for the booking."""
    try:
        from bookings.models import Booking
        from rooms.models import Room
        
        booking = Booking.objects.select_related(
            'service', 'service__service_type'
        ).get(id=booking_id)
        
        # Check if room already exists
        if hasattr(booking, 'room') and booking.room:
            return {
                'room_id': str(booking.room.id),
                'room_name': booking.room.name,
                'already_existed': True
            }
        
        # Create room based on service type
        room_type = 'individual' if booking.service.service_type.code == 'session' else 'group'
        
        with transaction.atomic():
            room = Room.objects.create(
                booking=booking,
                name=f"session-{booking_id}",
                room_type=room_type,
                max_participants=booking.service.max_participants,
                enable_recording=booking.service.allow_recording,
                sip_enabled=True,  # Enable dial-in
            )
            
            # Create room in LiveKit
            from rooms.livekit.client import get_livekit_client
            client = get_livekit_client()
            
            livekit_room = await client.create_room(
                name=room.name,
                empty_timeout=600,  # 10 minutes
                max_participants=room.max_participants,
            )
            
            room.livekit_room_sid = livekit_room.sid
            room.save()
        
        return {
            'room_id': str(room.id),
            'room_name': room.name,
            'livekit_sid': room.livekit_room_sid,
            'dial_in_number': room.dial_in_number,
            'dial_in_pin': room.dial_in_pin,
        }
    except Exception as e:
        logger.error(f"Error creating room for booking: {e}")
        raise


@activity.defn
async def check_participant_attendance(booking_id: str) -> Dict[str, bool]:
    """Check if participants have joined the session."""
    try:
        from bookings.models import Booking
        from rooms.models import RoomParticipant

        booking = Booking.objects.select_related('livekit_room', 'service_session__livekit_room').get(id=booking_id)
        
        if not hasattr(booking, 'room') or not booking.room:
            return {'client_joined': False, 'practitioner_joined': False}
        
        # Check participants
        participants = RoomParticipant.objects.filter(
            room=booking.room,
            left_at__isnull=True  # Currently in room
        )
        
        client_joined = participants.filter(user=booking.user).exists()
        practitioner_joined = participants.filter(
            user=booking.practitioner.user
        ).exists()
        
        return {
            'client_joined': client_joined,
            'practitioner_joined': practitioner_joined,
            'total_participants': participants.count()
        }
    except Exception as e:
        logger.error(f"Error checking attendance: {e}")
        raise


@activity.defn
async def process_no_show(booking_id: str) -> bool:
    """Process a no-show booking."""
    try:
        from bookings.models import Booking
        
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(id=booking_id)
            
            # Update booking status
            booking.status = 'no_show'
            booking.no_show_processed_at = datetime.utcnow()
            booking.save()
            
            # Apply cancellation policy
            # TODO: Implement based on service cancellation policy
            
            # Notify practitioner
            await send_email(
                to_email=booking.practitioner.user.email,
                template_id='no_show_notification',
                context={
                    'practitioner_name': booking.practitioner.user.first_name,
                    'client_name': booking.user.full_name,
                    'service_name': booking.service.name,
                    'scheduled_time': booking.start_time,
                }
            )
            
            # Log event
            await log_event(
                event_type='booking.no_show',
                entity_type='booking',
                entity_id=str(booking_id),
                data={
                    'timestamp': datetime.utcnow().isoformat(),
                    'client_id': str(booking.user.id),
                    'practitioner_id': str(booking.practitioner.id),
                }
            )
        
        return True
    except Exception as e:
        logger.error(f"Error processing no-show: {e}")
        raise


@activity.defn
async def complete_booking(booking_id: str) -> bool:
    """Mark booking as completed."""
    try:
        from bookings.models import Booking
        
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(id=booking_id)
            
            if booking.status != 'in_progress':
                # Assume it should be in progress by now
                booking.status = 'in_progress'
            
            # Complete the booking
            booking.status = 'completed'
            booking.completed_at = datetime.utcnow()
            booking.save()
            
            # Close the room
            if hasattr(booking, 'room') and booking.room:
                booking.room.status = 'ended'
                booking.room.ended_at = datetime.utcnow()
                booking.room.save()
        
        return True
    except Exception as e:
        logger.error(f"Error completing booking: {e}")
        raise


@activity.defn
async def calculate_practitioner_earnings(booking_id: str) -> Dict[str, Any]:
    """Calculate earnings for the practitioner."""
    try:
        from bookings.models import Booking
        from payments.models import EarningsTransaction
        
        booking = Booking.objects.select_related(
            'service', 'practitioner'
        ).get(id=booking_id)
        
        # Get commission rate
        commission_rate = booking.practitioner.commission_rate or 20.0
        
        # Calculate earnings
        gross_amount_cents = booking.total_price_cents
        commission_amount_cents = int(gross_amount_cents * commission_rate / 100)
        net_amount_cents = gross_amount_cents - commission_amount_cents
        
        # Create earnings transaction
        with transaction.atomic():
            earnings = EarningsTransaction.objects.create(
                practitioner=booking.practitioner,
                booking=booking,
                gross_amount_cents=gross_amount_cents,
                commission_rate=commission_rate,
                commission_amount_cents=commission_amount_cents,
                net_amount_cents=net_amount_cents,
                status='pending',
                available_after=datetime.utcnow() + timedelta(hours=48),
            )
            
            # Update practitioner balance
            balance = booking.practitioner.earnings_balance
            balance.pending_balance_cents += net_amount_cents
            balance.lifetime_earnings_cents += net_amount_cents
            balance.save()
        
        return {
            'earnings_id': str(earnings.id),
            'gross_amount_cents': gross_amount_cents,
            'net_amount_cents': net_amount_cents,
            'commission_rate': commission_rate,
        }
    except Exception as e:
        logger.error(f"Error calculating earnings: {e}")
        raise


@activity.defn
async def send_post_session_survey(booking_id: str) -> bool:
    """Send post-session survey to client."""
    try:
        from bookings.models import Booking
        
        booking = Booking.objects.select_related(
            'user', 'service', 'practitioner'
        ).get(id=booking_id)
        
        # Generate survey link
        survey_link = f"https://estuary.app/survey/{booking_id}"
        
        await send_email(
            to_email=booking.user.email,
            template_id='post_session_survey',
            context={
                'client_name': booking.user.first_name,
                'service_name': booking.service.name,
                'practitioner_name': booking.practitioner.display_name,
                'survey_link': survey_link,
            }
        )
        
        return True
    except Exception as e:
        logger.error(f"Error sending survey: {e}")
        raise


# Export all activities
ACTIVITIES = [
    validate_booking,
    send_booking_confirmation,
    send_booking_reminder,
    create_room_for_booking,
    check_participant_attendance,
    process_no_show,
    complete_booking,
    calculate_practitioner_earnings,
    send_post_session_survey,
]