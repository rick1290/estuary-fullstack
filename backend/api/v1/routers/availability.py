"""
Availability management API endpoints for practitioners.
"""
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from django.db.models import Q
import pytz

from api.dependencies import get_current_user
from asgiref.sync import sync_to_async
from django.db import transaction as db_transaction
from api.v1.schemas.availability import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse, ScheduleListResponse,
    BulkScheduleCreate, BulkScheduleResponse,
    TimeSlotCreate, TimeSlotUpdate, TimeSlotResponse,
    AvailabilityExceptionCreate, AvailabilityExceptionResponse, AvailabilityExceptionListResponse,
    TimeSlotQuery, AvailableSlotsResponse, AvailableSlotsGroupedResponse,
    AvailableSlot, AvailableSlotsByDate,
    AvailabilityCheckRequest, AvailabilityCheckResponse,
    WorkingHoursCreate, WorkingHoursResponse,
    ExceptionType
)
from practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot, SchedulePreference,
    ServiceSchedule, ScheduleAvailability, OutOfOffice
)
from services.models import Service
from bookings.models import Booking
from users.models import User
from practitioners.utils.availability import get_practitioner_availability


router = APIRouter(prefix="/availability", tags=["Availability"])


@sync_to_async
def get_practitioner_from_user(user: User) -> Practitioner:
    """Get practitioner profile from user or raise 403."""
    try:
        return Practitioner.objects.get(user=user)
    except Practitioner.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a practitioner"
        )


@router.get("/schedules", response_model=ScheduleListResponse)
async def list_schedules(
    current_user: User = Depends(get_current_user),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all schedules for the current practitioner."""
    practitioner = await get_practitioner_from_user(current_user)
    
    @sync_to_async
    def get_schedules_from_db():
        queryset = Schedule.objects.filter(practitioner=practitioner)
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        total = queryset.count()
        schedules = list(queryset.prefetch_related('time_slots')[skip:skip+limit])
        
        # Build response data
        schedule_responses = []
        for schedule in schedules:
            time_slots = schedule.time_slots.all().order_by('day', 'start_time')
            
            schedule_dict = {
                "id": str(schedule.id),
                "name": schedule.name,
                "description": schedule.description,
                "timezone": schedule.timezone,
                "is_default": schedule.is_default,
                "is_active": schedule.is_active,
                "created_at": schedule.created_at,
                "updated_at": schedule.updated_at,
                "time_slots": [
                    {
                        "id": str(slot.id),
                        "day": slot.day,
                        "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][slot.day],
                        "start_time": slot.start_time,
                        "end_time": slot.end_time,
                        "is_active": slot.is_active,
                        "created_at": slot.created_at,
                        "updated_at": slot.updated_at
                    }
                    for slot in time_slots
                ]
            }
            schedule_responses.append(ScheduleResponse(**schedule_dict))
        
        return schedule_responses, total
    
    schedules, total = await get_schedules_from_db()
    
    return ScheduleListResponse(
        success=True,
        schedules=schedules,
        total=total
    )


@router.post("/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new recurring schedule."""
    practitioner = await get_practitioner_from_user(current_user)
    
    # Create schedule with Django ORM
    @sync_to_async
    @db_transaction.atomic
    def create_schedule_in_db():
        # If this is being set as default, unset other defaults
        if schedule_data.is_default:
            Schedule.objects.filter(
                practitioner=practitioner,
                is_default=True
            ).update(is_default=False)
        
        # Create the schedule
        schedule = Schedule.objects.create(
            practitioner=practitioner,
            name=schedule_data.name,
            description=schedule_data.description,
            timezone=schedule_data.timezone,
            is_default=schedule_data.is_default,
            is_active=schedule_data.is_active
        )
        
        # Create time slots
        time_slots = []
        for slot_data in schedule_data.time_slots:
            slot = ScheduleTimeSlot.objects.create(
                schedule=schedule,
                day=slot_data.day,
                start_time=slot_data.start_time,
                end_time=slot_data.end_time,
                is_active=slot_data.is_active
            )
            time_slots.append(slot)
        
        # Reload with related data
        schedule.refresh_from_db()
        return schedule
    
    schedule = await create_schedule_in_db()
    
    # Build response with Django ORM data
    @sync_to_async
    def build_schedule_response():
        time_slots = schedule.time_slots.all().order_by('day', 'start_time')
        
        schedule_dict = {
            "id": str(schedule.id),
            "name": schedule.name,
            "description": schedule.description,
            "timezone": schedule.timezone,
            "is_default": schedule.is_default,
            "is_active": schedule.is_active,
            "created_at": schedule.created_at,
            "updated_at": schedule.updated_at,
            "time_slots": [
                {
                    "id": str(slot.id),
                    "day": slot.day,
                    "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][slot.day],
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "is_active": slot.is_active,
                    "created_at": slot.created_at,
                    "updated_at": slot.updated_at
                }
                for slot in time_slots
            ]
        }
        return ScheduleResponse(**schedule_dict)
    
    return await build_schedule_response()


@router.patch("/schedules/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    schedule_data: ScheduleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a schedule."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.practitioner_id == practitioner.id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # If setting as default, unset other defaults
    if schedule_data.is_default:
        db.query(Schedule).filter(
            Schedule.practitioner_id == practitioner.id,
            Schedule.is_default == True,
            Schedule.id != schedule_id
        ).update({"is_default": False})
    
    # Update schedule fields
    update_data = schedule_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)
    
    db.commit()
    db.refresh(schedule)
    
    # Load time slots
    time_slots = db.query(ScheduleTimeSlot).filter(
        ScheduleTimeSlot.schedule_id == schedule.id
    ).order_by(ScheduleTimeSlot.day, ScheduleTimeSlot.start_time).all()
    
    # Build response
    schedule_dict = {
        "id": str(schedule.id),
        "name": schedule.name,
        "description": schedule.description,
        "timezone": schedule.timezone,
        "is_default": schedule.is_default,
        "is_active": schedule.is_active,
        "created_at": schedule.created_at,
        "updated_at": schedule.updated_at,
        "time_slots": [
            {
                "id": str(slot.id),
                "day": slot.day,
                "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][slot.day],
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "is_active": slot.is_active,
                "created_at": slot.created_at,
                "updated_at": slot.updated_at
            }
            for slot in time_slots
        ]
    }
    
    return ScheduleResponse(**schedule_dict)


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a schedule."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.practitioner_id == practitioner.id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Don't allow deleting the last active schedule
    active_schedules = db.query(Schedule).filter(
        Schedule.practitioner_id == practitioner.id,
        Schedule.is_active == True,
        Schedule.id != schedule_id
    ).count()
    
    if active_schedules == 0 and schedule.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last active schedule"
        )
    
    db.delete(schedule)
    db.commit()


@router.post("/schedules/bulk", response_model=BulkScheduleResponse)
async def bulk_create_schedules(
    bulk_data: BulkScheduleCreate,
    current_user: User = Depends(get_current_user)
):
    """Bulk create or update schedules."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    created_schedules = []
    updated_schedules = []
    deleted_ids = []
    errors = []
    
    try:
        # If replacing existing, delete all current schedules
        if bulk_data.replace_existing:
            existing_schedules = db.query(Schedule).filter(
                Schedule.practitioner_id == practitioner.id
            ).all()
            for schedule in existing_schedules:
                deleted_ids.append(str(schedule.id))
                db.delete(schedule)
        
        # Create new schedules
        for schedule_data in bulk_data.schedules:
            try:
                # Create the schedule
                schedule = Schedule(
                    practitioner_id=practitioner.id,
                    name=schedule_data.name,
                    description=schedule_data.description,
                    timezone=schedule_data.timezone,
                    is_default=schedule_data.is_default,
                    is_active=schedule_data.is_active
                )
                db.add(schedule)
                db.flush()
                
                # Create time slots
                time_slots = []
                for slot_data in schedule_data.time_slots:
                    slot = ScheduleTimeSlot(
                        schedule_id=schedule.id,
                        day=slot_data.day,
                        start_time=slot_data.start_time,
                        end_time=slot_data.end_time,
                        is_active=slot_data.is_active
                    )
                    db.add(slot)
                    time_slots.append(slot)
                
                db.flush()
                
                # Build response
                schedule_dict = {
                    "id": str(schedule.id),
                    "name": schedule.name,
                    "description": schedule.description,
                    "timezone": schedule.timezone,
                    "is_default": schedule.is_default,
                    "is_active": schedule.is_active,
                    "created_at": schedule.created_at,
                    "updated_at": schedule.updated_at,
                    "time_slots": [
                        {
                            "id": str(slot.id),
                            "day": slot.day,
                            "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][slot.day],
                            "start_time": slot.start_time,
                            "end_time": slot.end_time,
                            "is_active": slot.is_active,
                            "created_at": slot.created_at,
                            "updated_at": slot.updated_at
                        }
                        for slot in time_slots
                    ]
                }
                created_schedules.append(ScheduleResponse(**schedule_dict))
                
            except Exception as e:
                errors.append({
                    "schedule_name": schedule_data.name,
                    "error": str(e)
                })
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bulk operation failed: {str(e)}"
        )
    
    return BulkScheduleResponse(
        success=True,
        created=created_schedules,
        updated=updated_schedules,
        deleted=deleted_ids,
        errors=errors if errors else None
    )


@router.get("/slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    query: TimeSlotQuery = Depends(),
    current_user: User = Depends(get_current_user)
):
    """Get available time slots for booking."""
    # Use the existing availability utility function
    slots_data = get_practitioner_availability(
        service_id=query.service_id,
        start_date=query.start_date,
        end_date=query.end_date,
        days_ahead=query.days_ahead
    )
    
    # Convert to response format
    tz = pytz.timezone(query.timezone)
    slots = []
    
    for slot_data in slots_data:
        # Convert times to requested timezone
        start_dt = slot_data['start_datetime']
        end_dt = slot_data['end_datetime']
        
        if start_dt.tzinfo:
            start_dt = start_dt.astimezone(tz)
            end_dt = end_dt.astimezone(tz)
        
        slot = AvailableSlot(
            start_datetime=start_dt,
            end_datetime=end_dt,
            date=start_dt.date(),
            day=start_dt.weekday(),
            day_name=slot_data.get('day_name', ''),
            start_time=start_dt.time(),
            end_time=end_dt.time(),
            is_available=slot_data.get('is_available', True),
            service_id=slot_data.get('service_id', query.service_id),
            schedule_id=slot_data.get('schedule_id'),
            schedule_name=slot_data.get('schedule_name'),
            timezone=query.timezone
        )
        slots.append(slot)
    
    # Determine actual date range
    if slots:
        start_date = min(slot.date for slot in slots)
        end_date = max(slot.date for slot in slots)
    else:
        start_date = query.start_date or date.today()
        end_date = query.end_date or (start_date + timedelta(days=query.days_ahead))
    
    # Group by date if requested
    if query.group_by_date:
        grouped_dates = {}
        for slot in slots:
            if slot.date not in grouped_dates:
                grouped_dates[slot.date] = {
                    'date': slot.date,
                    'day_name': slot.day_name,
                    'slots': [],
                    'total_slots': 0
                }
            grouped_dates[slot.date]['slots'].append(slot)
            grouped_dates[slot.date]['total_slots'] += 1
        
        dates_list = [
            AvailableSlotsByDate(**data)
            for data in sorted(grouped_dates.values(), key=lambda x: x['date'])
        ]
        
        return AvailableSlotsGroupedResponse(
            success=True,
            dates=dates_list,
            total_dates=len(dates_list),
            total_slots=len(slots),
            timezone=query.timezone,
            start_date=start_date,
            end_date=end_date
        )
    else:
        return AvailableSlotsResponse(
            success=True,
            slots=slots,
            total=len(slots),
            timezone=query.timezone,
            start_date=start_date,
            end_date=end_date
        )


@router.post("/exceptions", response_model=AvailabilityExceptionResponse, status_code=status.HTTP_201_CREATED)
async def add_availability_exception(
    exception_data: AvailabilityExceptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Add an availability exception (vacation, holiday, etc.)."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    # Create OutOfOffice record (using existing model)
    out_of_office = OutOfOffice(
        practitioner_id=practitioner.id,
        from_date=exception_data.start_date,
        to_date=exception_data.end_date,
        title=exception_data.reason or exception_data.exception_type.value,
        is_archived=False
    )
    db.add(out_of_office)
    db.commit()
    db.refresh(out_of_office)
    
    # Build response
    return AvailabilityExceptionResponse(
        id=str(out_of_office.id),
        exception_type=exception_data.exception_type,
        start_date=out_of_office.from_date,
        end_date=out_of_office.to_date,
        start_time=exception_data.start_time,
        end_time=exception_data.end_time,
        reason=out_of_office.title,
        is_recurring=exception_data.is_recurring,
        affects_all_services=exception_data.affects_all_services,
        affected_service_ids=exception_data.affected_service_ids,
        created_at=out_of_office.created_at,
        updated_at=out_of_office.updated_at
    )


@router.get("/exceptions", response_model=AvailabilityExceptionListResponse)
async def list_exceptions(
    current_user: User = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    is_archived: bool = Query(False, description="Include archived exceptions"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List availability exceptions."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    query = db.query(OutOfOffice).filter(
        OutOfOffice.practitioner_id == practitioner.id
    )
    
    if not is_archived:
        query = query.filter(OutOfOffice.is_archived == False)
    
    if start_date:
        query = query.filter(OutOfOffice.to_date >= start_date)
    
    if end_date:
        query = query.filter(OutOfOffice.from_date <= end_date)
    
    total = query.count()
    exceptions = query.order_by(OutOfOffice.from_date.desc()).offset(skip).limit(limit).all()
    
    # Convert to response format
    exception_responses = []
    for exception in exceptions:
        # Determine exception type from title
        exception_type = ExceptionType.OTHER
        title_lower = exception.title.lower()
        if 'vacation' in title_lower:
            exception_type = ExceptionType.VACATION
        elif 'holiday' in title_lower:
            exception_type = ExceptionType.HOLIDAY
        elif 'personal' in title_lower:
            exception_type = ExceptionType.PERSONAL
        elif 'training' in title_lower:
            exception_type = ExceptionType.TRAINING
        
        exception_responses.append(AvailabilityExceptionResponse(
            id=str(exception.id),
            exception_type=exception_type,
            start_date=exception.from_date,
            end_date=exception.to_date,
            start_time=None,
            end_time=None,
            reason=exception.title,
            is_recurring=False,
            affects_all_services=True,
            affected_service_ids=None,
            created_at=exception.created_at,
            updated_at=exception.updated_at
        ))
    
    return AvailabilityExceptionListResponse(
        success=True,
        exceptions=exception_responses,
        total=total
    )


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_exception(
    exception_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove an availability exception."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    exception = db.query(OutOfOffice).filter(
        OutOfOffice.id == exception_id,
        OutOfOffice.practitioner_id == practitioner.id
    ).first()
    
    if not exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exception not found"
        )
    
    # Archive instead of delete
    exception.is_archived = True
    db.commit()


@router.post("/check", response_model=AvailabilityCheckResponse)
async def check_availability(
    check_request: AvailabilityCheckRequest,
    current_user: User = Depends(get_current_user)
):
    """Check if a specific time is available."""
    # Get the service
    service = db.query(Service).filter(Service.id == check_request.service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Calculate end time if not provided
    end_datetime = check_request.end_datetime
    if not end_datetime:
        duration = service.duration_minutes or 60
        end_datetime = check_request.start_datetime + timedelta(minutes=duration)
    
    # Get the practitioner
    practitioner_rel = service.practitioner_relationships.filter(
        lambda x: x.is_primary
    ).first()
    if not practitioner_rel:
        practitioner_rel = service.practitioner_relationships.first()
    
    if not practitioner_rel:
        return AvailabilityCheckResponse(
            success=True,
            is_available=False,
            reason="No practitioner assigned to this service"
        )
    
    practitioner = practitioner_rel.practitioner
    
    # Check if time falls within schedule
    tz = pytz.timezone(check_request.timezone)
    local_start = check_request.start_datetime.astimezone(tz)
    local_end = end_datetime.astimezone(tz)
    
    day_of_week = local_start.weekday()
    start_time = local_start.time()
    end_time = local_end.time()
    
    # Check against schedules
    schedule_available = False
    schedules = db.query(Schedule).filter(
        Schedule.practitioner_id == practitioner.id,
        Schedule.is_active == True
    ).all()
    
    for schedule in schedules:
        time_slots = db.query(ScheduleTimeSlot).filter(
            ScheduleTimeSlot.schedule_id == schedule.id,
            ScheduleTimeSlot.day == day_of_week,
            ScheduleTimeSlot.is_active == True,
            ScheduleTimeSlot.start_time <= start_time,
            ScheduleTimeSlot.end_time >= end_time
        ).first()
        
        if time_slots:
            schedule_available = True
            break
    
    if not schedule_available:
        # Check service schedules as fallback
        service_schedule = db.query(ServiceSchedule).filter(
            ServiceSchedule.practitioner_id == practitioner.id,
            ServiceSchedule.service_id == service.id,
            ServiceSchedule.day == day_of_week,
            ServiceSchedule.is_active == True,
            ServiceSchedule.start_time <= start_time,
            ServiceSchedule.end_time >= end_time
        ).first()
        
        if service_schedule:
            schedule_available = True
    
    if not schedule_available:
        return AvailabilityCheckResponse(
            success=True,
            is_available=False,
            reason="Time is outside of practitioner's working hours"
        )
    
    # Check for exceptions
    exception_date = local_start.date()
    exception = db.query(OutOfOffice).filter(
        OutOfOffice.practitioner_id == practitioner.id,
        OutOfOffice.from_date <= exception_date,
        OutOfOffice.to_date >= exception_date,
        OutOfOffice.is_archived == False
    ).first()
    
    if exception:
        return AvailabilityCheckResponse(
            success=True,
            is_available=False,
            reason=f"Practitioner is unavailable: {exception.title}"
        )
    
    # Check for conflicts with existing bookings
    conflicts = db.query(Booking).filter(
        Booking.practitioner_id == practitioner.id,
        Booking.status.in_(['confirmed', 'pending']),
        or_(
            and_(
                Booking.start_time <= check_request.start_datetime,
                Booking.end_time > check_request.start_datetime
            ),
            and_(
                Booking.start_time < end_datetime,
                Booking.end_time >= end_datetime
            ),
            and_(
                Booking.start_time >= check_request.start_datetime,
                Booking.end_time <= end_datetime
            )
        )
    ).all()
    
    if conflicts:
        conflict_info = [
            {
                "booking_id": str(booking.id),
                "start_time": booking.start_time.isoformat(),
                "end_time": booking.end_time.isoformat() if booking.end_time else None,
                "service_name": booking.service.name if booking.service else None
            }
            for booking in conflicts
        ]
        
        # Get suggested times
        slots_data = get_practitioner_availability(
            service_id=check_request.service_id,
            start_date=exception_date,
            end_date=exception_date + timedelta(days=7),
            days_ahead=7
        )
        
        suggested_slots = []
        for slot_data in slots_data[:5]:  # Limit to 5 suggestions
            start_dt = slot_data['start_datetime']
            end_dt = slot_data['end_datetime']
            
            if start_dt.tzinfo:
                start_dt = start_dt.astimezone(tz)
                end_dt = end_dt.astimezone(tz)
            
            suggested_slots.append(AvailableSlot(
                start_datetime=start_dt,
                end_datetime=end_dt,
                date=start_dt.date(),
                day=start_dt.weekday(),
                day_name=slot_data.get('day_name', ''),
                start_time=start_dt.time(),
                end_time=end_dt.time(),
                is_available=True,
                service_id=check_request.service_id,
                schedule_id=slot_data.get('schedule_id'),
                schedule_name=slot_data.get('schedule_name'),
                timezone=check_request.timezone
            ))
        
        return AvailabilityCheckResponse(
            success=True,
            is_available=False,
            reason="Time conflicts with existing bookings",
            conflicts=conflict_info,
            suggested_times=suggested_slots
        )
    
    return AvailabilityCheckResponse(
        success=True,
        is_available=True
    )


@router.post("/working-hours", response_model=WorkingHoursResponse, status_code=status.HTTP_201_CREATED)
async def set_working_hours(
    hours_data: WorkingHoursCreate,
    current_user: User = Depends(get_current_user)
):
    """Set default working hours for the practitioner."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    # Get or create schedule preference
    preference = db.query(SchedulePreference).filter(
        SchedulePreference.practitioner_id == practitioner.id
    ).first()
    
    if not preference:
        preference = SchedulePreference(
            practitioner_id=practitioner.id,
            timezone=hours_data.timezone,
            is_active=True
        )
        db.add(preference)
    else:
        preference.timezone = hours_data.timezone
    
    # Update buffer and booking settings
    preference.advance_booking_min_hours = hours_data.advance_booking_hours
    preference.advance_booking_max_days = hours_data.advance_booking_days
    
    # Update practitioner buffer time
    practitioner.buffer_time = hours_data.buffer_time_minutes
    
    db.commit()
    
    # Create or update default schedule with the working hours
    default_schedule = db.query(Schedule).filter(
        Schedule.practitioner_id == practitioner.id,
        Schedule.is_default == True
    ).first()
    
    if not default_schedule:
        default_schedule = Schedule(
            practitioner_id=practitioner.id,
            name="Default Working Hours",
            description="Automatically generated from working hours settings",
            timezone=hours_data.timezone,
            is_default=True,
            is_active=True
        )
        db.add(default_schedule)
        db.flush()
    
    # Clear existing time slots
    db.query(ScheduleTimeSlot).filter(
        ScheduleTimeSlot.schedule_id == default_schedule.id
    ).delete()
    
    # Create time slots from working hours
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    for day_idx, day_name in enumerate(days):
        day_hours = getattr(hours_data, day_name)
        if day_hours:
            time_slot = ScheduleTimeSlot(
                schedule_id=default_schedule.id,
                day=day_idx,
                start_time=day_hours['start'],
                end_time=day_hours['end'],
                is_active=True
            )
            db.add(time_slot)
    
    db.commit()
    db.refresh(preference)
    
    # Build response
    response_data = {
        "timezone": preference.timezone,
        "buffer_time_minutes": practitioner.buffer_time,
        "advance_booking_hours": preference.advance_booking_min_hours,
        "advance_booking_days": preference.advance_booking_max_days,
        "created_at": preference.created_at,
        "updated_at": preference.updated_at
    }
    
    # Add working hours
    for day_name in days:
        day_hours = getattr(hours_data, day_name)
        response_data[day_name] = day_hours
    
    return WorkingHoursResponse(**response_data)


# Add/Update time slot endpoints for existing schedules
@router.post("/schedules/{schedule_id}/time-slots", response_model=TimeSlotResponse, status_code=status.HTTP_201_CREATED)
async def add_time_slot(
    schedule_id: str,
    slot_data: TimeSlotCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a time slot to an existing schedule."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.practitioner_id == practitioner.id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Check for overlapping slots
    overlapping = db.query(ScheduleTimeSlot).filter(
        ScheduleTimeSlot.schedule_id == schedule_id,
        ScheduleTimeSlot.day == slot_data.day,
        ScheduleTimeSlot.is_active == True,
        or_(
            and_(
                ScheduleTimeSlot.start_time <= slot_data.start_time,
                ScheduleTimeSlot.end_time > slot_data.start_time
            ),
            and_(
                ScheduleTimeSlot.start_time < slot_data.end_time,
                ScheduleTimeSlot.end_time >= slot_data.end_time
            )
        )
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time slot overlaps with existing slot"
        )
    
    # Create the time slot
    time_slot = ScheduleTimeSlot(
        schedule_id=schedule_id,
        day=slot_data.day,
        start_time=slot_data.start_time,
        end_time=slot_data.end_time,
        is_active=slot_data.is_active
    )
    db.add(time_slot)
    db.commit()
    db.refresh(time_slot)
    
    return TimeSlotResponse(
        id=str(time_slot.id),
        day=time_slot.day,
        day_name=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][time_slot.day],
        start_time=time_slot.start_time,
        end_time=time_slot.end_time,
        is_active=time_slot.is_active,
        created_at=time_slot.created_at,
        updated_at=time_slot.updated_at
    )


@router.patch("/schedules/{schedule_id}/time-slots/{slot_id}", response_model=TimeSlotResponse)
async def update_time_slot(
    schedule_id: str,
    slot_id: str,
    slot_data: TimeSlotUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a time slot in a schedule."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    # Verify schedule ownership
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.practitioner_id == practitioner.id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Get the time slot
    time_slot = db.query(ScheduleTimeSlot).filter(
        ScheduleTimeSlot.id == slot_id,
        ScheduleTimeSlot.schedule_id == schedule_id
    ).first()
    
    if not time_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time slot not found"
        )
    
    # Update fields
    update_data = slot_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(time_slot, field, value)
    
    # Validate no overlaps if time changed
    if 'day' in update_data or 'start_time' in update_data or 'end_time' in update_data:
        overlapping = db.query(ScheduleTimeSlot).filter(
            ScheduleTimeSlot.schedule_id == schedule_id,
            ScheduleTimeSlot.day == time_slot.day,
            ScheduleTimeSlot.is_active == True,
            ScheduleTimeSlot.id != slot_id,
            or_(
                and_(
                    ScheduleTimeSlot.start_time <= time_slot.start_time,
                    ScheduleTimeSlot.end_time > time_slot.start_time
                ),
                and_(
                    ScheduleTimeSlot.start_time < time_slot.end_time,
                    ScheduleTimeSlot.end_time >= time_slot.end_time
                )
            )
        ).first()
        
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Updated time slot would overlap with existing slot"
            )
    
    db.commit()
    db.refresh(time_slot)
    
    return TimeSlotResponse(
        id=str(time_slot.id),
        day=time_slot.day,
        day_name=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][time_slot.day],
        start_time=time_slot.start_time,
        end_time=time_slot.end_time,
        is_active=time_slot.is_active,
        created_at=time_slot.created_at,
        updated_at=time_slot.updated_at
    )


@router.delete("/schedules/{schedule_id}/time-slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_slot(
    schedule_id: str,
    slot_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a time slot from a schedule."""
    practitioner = get_practitioner_from_user(current_user, db)
    
    # Verify schedule ownership
    schedule = db.query(Schedule).filter(
        Schedule.id == schedule_id,
        Schedule.practitioner_id == practitioner.id
    ).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    # Get and delete the time slot
    time_slot = db.query(ScheduleTimeSlot).filter(
        ScheduleTimeSlot.id == slot_id,
        ScheduleTimeSlot.schedule_id == schedule_id
    ).first()
    
    if not time_slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time slot not found"
        )
    
    db.delete(time_slot)
    db.commit()