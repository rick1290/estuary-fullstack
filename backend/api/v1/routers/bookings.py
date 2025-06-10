"""
Bookings router - Fixed version with correct field names
"""
from typing import Annotated, List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from django.db import transaction
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from asgiref.sync import sync_to_async
from bookings.models import Booking
from services.models import Service
from practitioners.models import Practitioner
from utils.models import Address
from rooms.models import Room
from api.dependencies import (
    get_current_user,
    get_current_user_optional,
    get_current_superuser,
    get_pagination_params,
    PaginationParams
)
from api.v1.schemas.bookings import (
    BookingCreate,
    BookingUpdate,
    BookingCancel,
    BookingResponse,
    BookingListResponse,
    BookingAvailabilityQuery,
    BookingAvailabilityResponse,
    BookingStatsResponse,
    TimeSlot,
)
from django.contrib.auth import get_user_model

User = get_user_model()
router = APIRouter()


# Helper functions for complex database operations
@sync_to_async
def get_bookings_queryset_with_filters(
    current_user, status_filter, service_id, practitioner_id, user_id, 
    location_id, date_from, date_to, upcoming_only, ordering, is_staff, is_superuser
):
    """Get filtered bookings queryset with all filters applied"""
    queryset = Booking.objects.select_related(
        'service', 'practitioner__user', 'user', 'location', 'room'
    )
    
    # Apply permission filters
    if not is_staff:
        # Regular users can only see their own bookings
        queryset = queryset.filter(user=current_user)
    elif user_id and not is_superuser:
        # Staff can filter by user
        queryset = queryset.filter(user_id=user_id)
    
    # Apply filters
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    if service_id:
        queryset = queryset.filter(service_id=service_id)
    
    if practitioner_id:
        queryset = queryset.filter(practitioner_id=practitioner_id)
    
    if location_id:
        queryset = queryset.filter(location_id=location_id)
    
    if date_from:
        queryset = queryset.filter(start_time__date__gte=date_from)
    
    if date_to:
        queryset = queryset.filter(start_time__date__lte=date_to)
    
    if upcoming_only:
        queryset = queryset.filter(start_time__gt=timezone.now())
    
    # Apply ordering
    if ordering:
        queryset = queryset.order_by(ordering)
    else:
        queryset = queryset.order_by('-start_time')
    
    return queryset


@sync_to_async
def paginate_bookings(queryset, page_size, page_num):
    """Paginate bookings queryset and return page object and paginator"""
    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page_num)
    return page_obj, paginator


@sync_to_async
def check_booking_conflicts(practitioner, start_time, end_time, room=None, exclude_booking_id=None):
    """Check for conflicting bookings for a practitioner"""
    conflicting_bookings = Booking.objects.filter(
        practitioner=practitioner,
        status__in=['confirmed', 'pending_payment'],
        start_time__lt=end_time,
        end_time__gt=start_time
    )
    
    if room:
        conflicting_bookings = conflicting_bookings.filter(room=room)
    
    if exclude_booking_id:
        conflicting_bookings = conflicting_bookings.exclude(id=exclude_booking_id)
    
    return conflicting_bookings.exists()


@sync_to_async
def create_booking_transaction(booking_data, current_user, service, practitioner, location, room):
    """Create booking within a database transaction"""
    with transaction.atomic():
        # Calculate end time based on service duration
        end_time = booking_data.start_datetime + timedelta(minutes=service.duration_minutes)
        
        # Create booking
        booking = Booking.objects.create(
            user=current_user,
            service=service,
            practitioner=practitioner,
            location=location,
            room=room,
            start_time=booking_data.start_datetime,
            end_time=end_time,
            price_charged_cents=service.price_cents,
            final_amount_cents=service.price_cents,
            client_notes=booking_data.notes,
            status='pending_payment',
            payment_status='unpaid'
        )
        return booking


@sync_to_async
def get_booking_stats_data(queryset):
    """Get booking statistics from queryset"""
    # Calculate statistics
    stats = queryset.aggregate(
        total_bookings=Count('id'),
        completed_bookings=Count('id', filter=Q(status='completed')),
        cancelled_bookings=Count('id', filter=Q(status='canceled')),
        no_show_bookings=Count('id', filter=Q(status='no_show')),
        total_revenue=Sum('final_amount_cents', filter=Q(payment_status='paid')),
        average_booking_value=Avg('final_amount_cents', filter=Q(payment_status='paid'))
    )
    
    # Get most popular service
    popular_service = queryset.values('service__name').annotate(
        count=Count('id')
    ).order_by('-count').first()
    
    # Get most popular practitioner
    popular_practitioner = queryset.values(
        'practitioner__user__first_name',
        'practitioner__user__last_name'
    ).annotate(
        count=Count('id')
    ).order_by('-count').first()
    
    return stats, popular_service, popular_practitioner


@sync_to_async
def update_booking_fields(booking, update_data, current_user):
    """Update booking fields and save"""
    if 'start_datetime' in update_data:
        # Recalculate end time
        booking.start_time = update_data['start_datetime']
        booking.end_time = booking.start_time + timedelta(minutes=booking.service.duration_minutes)
    
    if 'room_id' in update_data and update_data['room_id']:
        try:
            room = Room.objects.get(
                id=update_data['room_id'],
                location=booking.location,
                is_active=True
            )
            booking.room = room
        except Room.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room not found or not available at this location"
            )
    
    if 'notes' in update_data:
        booking.client_notes = update_data['notes']
    
    if 'status' in update_data and current_user.is_staff:
        # Use the transition method for status changes
        if booking.can_transition_to(update_data['status']):
            booking.transition_to(update_data['status'])
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {booking.status} to {update_data['status']}"
            )
    
    booking.save()
    booking.refresh_from_db()
    return booking


@router.get("/", response_model=BookingListResponse)
async def list_bookings(
    pagination: Annotated[PaginationParams, Depends(get_pagination_params)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[str] = Query(None, description="Filter by booking status"),
    service_id: Optional[int] = Query(None, description="Filter by service"),
    practitioner_id: Optional[int] = Query(None, description="Filter by practitioner"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    location_id: Optional[int] = Query(None, description="Filter by location"),
    date_from: Optional[date] = Query(None, description="Filter bookings from date"),
    date_to: Optional[date] = Query(None, description="Filter bookings until date"),
    upcoming_only: bool = Query(False, description="Show only upcoming bookings"),
):
    """List bookings with filters"""
    # Get filtered queryset
    queryset = await get_bookings_queryset_with_filters(
        current_user, status, service_id, practitioner_id, user_id,
        location_id, date_from, date_to, upcoming_only, pagination.ordering,
        current_user.is_staff, current_user.is_superuser
    )
    
    # Paginate
    page_obj, paginator = await paginate_bookings(queryset, pagination.page_size, pagination.page)
    
    # Prepare response
    results = []
    for booking in page_obj:
        booking_dict = {
            'id': booking.id,
            'service_id': booking.service_id,
            'practitioner_id': booking.practitioner_id,
            'location_id': booking.location_id,
            'room_id': booking.room_id,
            'start_datetime': booking.start_time,
            'end_datetime': booking.end_time,
            'price': booking.final_amount,
            'notes': booking.client_notes,
            'created_at': booking.created_at,
            'updated_at': booking.updated_at,
            'customer_id': booking.user_id,
            'customer_email': booking.user.email,
            'customer_name': f"{booking.user.first_name} {booking.user.last_name}",
            'service_name': booking.service.name,
            'practitioner_name': f"{booking.practitioner.user.first_name} {booking.practitioner.user.last_name}",
            'location_name': booking.location.name if booking.location else None,
            'room_name': booking.room.name if booking.room else None,
            'status': booking.status,
            'payment_status': booking.payment_status,
            'confirmation_code': booking.public_uuid,
            'cancelled_at': booking.canceled_at,
            'cancelled_by': booking.canceled_by,
            'cancellation_reason': booking.cancellation_reason,
            'is_past': booking.end_time < timezone.now(),
            'is_cancellable': booking.can_be_canceled,
            'can_reschedule': booking.can_be_rescheduled,
        }
        results.append(BookingResponse(**booking_dict))
    
    return BookingListResponse(
        results=results,
        count=paginator.count,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=paginator.num_pages
    )


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Create a new booking"""
    try:
        # Validate service exists
        service = await sync_to_async(Service.objects.get)(id=booking_data.service_id, is_active=True)
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found or inactive"
        )
    
    try:
        # Validate practitioner
        practitioner = await sync_to_async(Practitioner.objects.get)(
            id=booking_data.practitioner_id,
            is_active=True,
            services__id=service.id
        )
    except Practitioner.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Practitioner not found or does not offer this service"
        )
    
    try:
        # Validate location (using Address model)
        location = await sync_to_async(Address.objects.get)(id=booking_data.location_id, is_active=True)
    except Address.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found or inactive"
        )
    
    # Validate room if provided
    room = None
    if booking_data.room_id:
        try:
            room = await sync_to_async(Room.objects.get)(
                id=booking_data.room_id,
                location=location,
                is_active=True
            )
        except Room.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room not found or not available at this location"
            )
    
    # Calculate end time based on service duration
    end_time = booking_data.start_datetime + timedelta(minutes=service.duration_minutes)
    
    # Check availability
    conflicts_exist = await check_booking_conflicts(
        practitioner, booking_data.start_datetime, end_time, room
    )
    
    if conflicts_exist:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Time slot not available"
        )
    
    try:
        # Create booking
        booking = await create_booking_transaction(
            booking_data, current_user, service, practitioner, location, room
        )
        
        # Prepare response
        booking_dict = {
            'id': booking.id,
            'service_id': booking.service_id,
            'practitioner_id': booking.practitioner_id,
            'location_id': booking.location_id,
            'room_id': booking.room_id,
            'start_datetime': booking.start_time,
            'end_datetime': booking.end_time,
            'price': booking.final_amount,
            'notes': booking.client_notes,
            'created_at': booking.created_at,
            'updated_at': booking.updated_at,
            'customer_id': booking.user_id,
            'customer_email': current_user.email,
            'customer_name': f"{current_user.first_name} {current_user.last_name}",
            'service_name': service.name,
            'practitioner_name': f"{practitioner.user.first_name} {practitioner.user.last_name}",
            'location_name': location.name,
            'room_name': room.name if room else None,
            'status': booking.status,
            'payment_status': booking.payment_status,
            'confirmation_code': booking.public_uuid,
            'cancelled_at': None,
            'cancelled_by': None,
            'cancellation_reason': None,
            'is_past': False,
            'is_cancellable': True,
            'can_reschedule': True,
        }
        
        return BookingResponse(**booking_dict)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create booking: {str(e)}"
        )


@router.get("/availability", response_model=BookingAvailabilityResponse)
async def check_availability(
    query: Annotated[BookingAvailabilityQuery, Depends()],
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)]
):
    """Check booking availability for a service on a specific date"""
    try:
        service = await sync_to_async(Service.objects.get)(id=query.service_id, is_active=True)
    except Service.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Get practitioners offering this service
    practitioners_qs = Practitioner.objects.filter(
        services__id=service.id,
        is_active=True
    )
    
    if query.practitioner_id:
        practitioners_qs = practitioners_qs.filter(id=query.practitioner_id)
    
    if query.location_id:
        practitioners_qs = practitioners_qs.filter(locations__id=query.location_id)
    
    # Convert queryset to list asynchronously
    practitioners = await sync_to_async(list)(practitioners_qs[:3])  # Limit to first 3 practitioners
    
    # TODO: Implement actual availability logic based on practitioner schedules
    # For now, return mock data
    available_slots = []
    
    # Mock time slots (9 AM to 5 PM, every hour)
    for hour in range(9, 17):
        for practitioner in practitioners:
            available_slots.append(TimeSlot(
                start_time=f"{hour:02d}:00",
                end_time=f"{hour + 1:02d}:00",
                practitioner_id=practitioner.id,
                practitioner_name=f"{practitioner.user.first_name} {practitioner.user.last_name}"
            ))
    
    return BookingAvailabilityResponse(
        date=query.date,
        service_id=service.id,
        service_name=service.name,
        location_id=query.location_id,
        available_slots=available_slots
    )


@router.get("/stats", response_model=BookingStatsResponse)
async def get_booking_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    date_from: Optional[date] = Query(None, description="Stats from date"),
    date_to: Optional[date] = Query(None, description="Stats until date"),
):
    """Get booking statistics"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Build queryset with filters
    queryset = Booking.objects.all()
    
    if date_from:
        queryset = queryset.filter(start_time__date__gte=date_from)
    
    if date_to:
        queryset = queryset.filter(start_time__date__lte=date_to)
    
    # Get statistics asynchronously
    stats, popular_service, popular_practitioner = await get_booking_stats_data(queryset)
    
    return BookingStatsResponse(
        total_bookings=stats['total_bookings'] or 0,
        completed_bookings=stats['completed_bookings'] or 0,
        cancelled_bookings=stats['cancelled_bookings'] or 0,
        no_show_bookings=stats['no_show_bookings'] or 0,
        total_revenue=(stats['total_revenue'] or 0) / 100,  # Convert cents to dollars
        average_booking_value=(stats['average_booking_value'] or 0) / 100,
        most_popular_service=popular_service['service__name'] if popular_service else None,
        most_popular_practitioner=f"{popular_practitioner['practitioner__user__first_name']} {popular_practitioner['practitioner__user__last_name']}" if popular_practitioner else None
    )


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get booking by ID"""
    try:
        booking = await sync_to_async(Booking.objects.select_related(
            'service', 'practitioner__user', 'user', 'location', 'room'
        ).get)(id=booking_id)
        
        # Check permissions
        if not current_user.is_staff and booking.user != current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Prepare response
        booking_dict = {
            'id': booking.id,
            'service_id': booking.service_id,
            'practitioner_id': booking.practitioner_id,
            'location_id': booking.location_id,
            'room_id': booking.room_id,
            'start_datetime': booking.start_time,
            'end_datetime': booking.end_time,
            'price': booking.final_amount,
            'notes': booking.client_notes,
            'created_at': booking.created_at,
            'updated_at': booking.updated_at,
            'customer_id': booking.user_id,
            'customer_email': booking.user.email,
            'customer_name': f"{booking.user.first_name} {booking.user.last_name}",
            'service_name': booking.service.name,
            'practitioner_name': f"{booking.practitioner.user.first_name} {booking.practitioner.user.last_name}",
            'location_name': booking.location.name if booking.location else None,
            'room_name': booking.room.name if booking.room else None,
            'status': booking.status,
            'payment_status': booking.payment_status,
            'confirmation_code': booking.public_uuid,
            'cancelled_at': booking.canceled_at,
            'cancelled_by': booking.canceled_by,
            'cancellation_reason': booking.cancellation_reason,
            'is_past': booking.end_time < timezone.now(),
            'is_cancellable': booking.can_be_canceled,
            'can_reschedule': booking.can_be_rescheduled,
        }
        
        return BookingResponse(**booking_dict)
    
    except Booking.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: int,
    booking_data: BookingUpdate,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Update booking"""
    try:
        booking = await sync_to_async(Booking.objects.get)(id=booking_id)
        
        # Check permissions
        if not current_user.is_staff and booking.user != current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Update fields
        update_data = booking_data.model_dump(exclude_unset=True)
        
        if 'start_datetime' in update_data:
            # Check availability for new time slot
            end_time = update_data['start_datetime'] + timedelta(minutes=booking.service.duration_minutes)
            
            conflicts_exist = await check_booking_conflicts(
                booking.practitioner, update_data['start_datetime'], end_time, 
                booking.room, exclude_booking_id=booking.id
            )
            
            if conflicts_exist:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Time slot not available"
                )
        
        # Update booking fields
        booking = await update_booking_fields(booking, update_data, current_user)
        
        # Prepare response
        booking_dict = {
            'id': booking.id,
            'service_id': booking.service_id,
            'practitioner_id': booking.practitioner_id,
            'location_id': booking.location_id,
            'room_id': booking.room_id,
            'start_datetime': booking.start_time,
            'end_datetime': booking.end_time,
            'price': booking.final_amount,
            'notes': booking.client_notes,
            'created_at': booking.created_at,
            'updated_at': booking.updated_at,
            'customer_id': booking.user_id,
            'customer_email': booking.user.email,
            'customer_name': f"{booking.user.first_name} {booking.user.last_name}",
            'service_name': booking.service.name,
            'practitioner_name': f"{booking.practitioner.user.first_name} {booking.practitioner.user.last_name}",
            'location_name': booking.location.name if booking.location else None,
            'room_name': booking.room.name if booking.room else None,
            'status': booking.status,
            'payment_status': booking.payment_status,
            'confirmation_code': booking.public_uuid,
            'cancelled_at': booking.canceled_at,
            'cancelled_by': booking.canceled_by,
            'cancellation_reason': booking.cancellation_reason,
            'is_past': booking.end_time < timezone.now(),
            'is_cancellable': booking.can_be_canceled,
            'can_reschedule': booking.can_be_rescheduled,
        }
        
        return BookingResponse(**booking_dict)
    
    except Booking.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    cancel_data: BookingCancel,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Cancel a booking"""
    try:
        booking = await sync_to_async(Booking.objects.get)(id=booking_id)
        
        # Check permissions
        if not current_user.is_staff and booking.user != current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Check if booking can be cancelled
        if not booking.can_be_canceled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking cannot be cancelled"
            )
        
        # Cancel booking using the model method
        await sync_to_async(booking.cancel)(reason=cancel_data.reason, canceled_by=cancel_data.cancelled_by)
        
        # TODO: Handle refunds, notifications, etc.
        
        # Prepare response
        booking_dict = {
            'id': booking.id,
            'service_id': booking.service_id,
            'practitioner_id': booking.practitioner_id,
            'location_id': booking.location_id,
            'room_id': booking.room_id,
            'start_datetime': booking.start_time,
            'end_datetime': booking.end_time,
            'price': booking.final_amount,
            'notes': booking.client_notes,
            'created_at': booking.created_at,
            'updated_at': booking.updated_at,
            'customer_id': booking.user_id,
            'customer_email': booking.user.email,
            'customer_name': f"{booking.user.first_name} {booking.user.last_name}",
            'service_name': booking.service.name,
            'practitioner_name': f"{booking.practitioner.user.first_name} {booking.practitioner.user.last_name}",
            'location_name': booking.location.name if booking.location else None,
            'room_name': booking.room.name if booking.room else None,
            'status': booking.status,
            'payment_status': booking.payment_status,
            'confirmation_code': booking.public_uuid,
            'cancelled_at': booking.canceled_at,
            'cancelled_by': booking.canceled_by,
            'cancellation_reason': booking.cancellation_reason,
            'is_past': booking.end_time < timezone.now(),
            'is_cancellable': False,
            'can_reschedule': False,
        }
        
        return BookingResponse(**booking_dict)
    
    except Booking.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )