"""
Utility functions for calculating practitioner availability.

This module handles the core availability logic:
1. Resolve practitioner from service
2. Load schedule preferences (timezone, buffers, holidays)
3. Find the active schedule (service-linked → practitioner default → ServiceSchedule)
4. Generate time slots at 15-minute intervals
5. Filter out booked slots and past slots
"""
import logging
import pytz
import json
from datetime import datetime, time, timedelta, date
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.db.models import Q

from practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot,
    ServiceSchedule, ScheduleAvailability, SchedulePreference
)
from services.models import Service

logger = logging.getLogger(__name__)


def get_practitioner_availability(
    service_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days_ahead: int = 30
) -> List[Dict[str, Any]]:
    """
    Calculate availability time slots for a practitioner based on a service.

    Returns an empty list if no availability is found — callers should check
    the logs for diagnostic info if the result is unexpectedly empty.
    """
    # ── Step 1: Resolve service and practitioner ──────────────────────────
    try:
        service = Service.objects.select_related(
            'primary_practitioner', 'schedule'
        ).get(id=service_id)
    except Service.DoesNotExist:
        logger.error(f"[Availability] Service {service_id} not found")
        return []

    # Resolve practitioner: direct FK first, then M2M
    practitioner = service.primary_practitioner
    if not practitioner:
        rel = service.practitioner_relationships.filter(is_primary=True).first()
        if not rel:
            rel = service.practitioner_relationships.first()
        if rel:
            practitioner = rel.practitioner

    if not practitioner:
        logger.warning(f"[Availability] No practitioner for service {service_id} ({service.name})")
        return []

    logger.info(
        f"[Availability] Calculating for service={service.name} (ID={service_id}), "
        f"practitioner={practitioner.display_name} (ID={practitioner.id})"
    )

    # ── Step 2: Date range defaults ───────────────────────────────────────
    now = timezone.now()
    if not start_date:
        start_date = now.date()
    if not end_date:
        end_date = start_date + timedelta(days=days_ahead)

    # ── Step 3: Load schedule preferences ─────────────────────────────────
    practitioner_timezone = pytz.UTC
    buffer_hours = 0
    min_days_buffer = 0
    max_days_buffer = 90  # generous default
    holidays = []

    try:
        pref = SchedulePreference.objects.get(practitioner=practitioner)

        # Timezone
        if pref.timezone:
            try:
                practitioner_timezone = pytz.timezone(pref.timezone)
            except pytz.exceptions.UnknownTimeZoneError:
                logger.warning(f"[Availability] Invalid timezone '{pref.timezone}' for practitioner {practitioner.id}")

        # Buffer settings — use the ACTUAL model field names
        buffer_hours = pref.advance_booking_min_hours or 0
        min_days_buffer = 0  # Not a separate field; buffer_hours handles this
        max_days_buffer = pref.advance_booking_max_days or 90

        # Holidays
        if pref.respect_holidays and pref.holidays:
            if isinstance(pref.holidays, list):
                holidays = pref.holidays
            elif isinstance(pref.holidays, str):
                try:
                    holidays = json.loads(pref.holidays)
                except (json.JSONDecodeError, TypeError):
                    holidays = []

        logger.info(
            f"[Availability] Preferences: tz={pref.timezone}, "
            f"buffer_hours={buffer_hours}, max_days={max_days_buffer}, "
            f"holidays={len(holidays)} dates"
        )
    except SchedulePreference.DoesNotExist:
        logger.info(f"[Availability] No SchedulePreference for practitioner {practitioner.id}, using defaults")

    # ── Step 4: Apply date range constraints ──────────────────────────────
    # Don't clip start_date by min_days_buffer — we use buffer_hours instead
    # (avoids blocking entire days when only hours matter)
    max_end = now.date() + timedelta(days=max_days_buffer)
    if end_date > max_end:
        end_date = max_end

    if start_date > end_date:
        logger.info(f"[Availability] start_date ({start_date}) > end_date ({end_date}), no slots possible")
        return []

    # ── Step 5: Get service duration ──────────────────────────────────────
    service_duration = service.duration_minutes or 60
    buffer_time = getattr(practitioner, 'buffer_time', 0) or 0
    total_duration = service_duration + buffer_time

    logger.info(f"[Availability] Duration={service_duration}min + buffer={buffer_time}min = {total_duration}min")

    # ── Step 6: Find the active schedule ──────────────────────────────────
    available_slots = []

    # Priority 1: Service has a directly linked schedule
    named_schedules = None
    if hasattr(service, 'schedule') and service.schedule_id:
        named_schedules = Schedule.objects.filter(
            id=service.schedule_id,
            is_active=True
        ).prefetch_related('time_slots')
        if named_schedules.exists():
            logger.info(f"[Availability] Using service-linked schedule: {named_schedules.first().name}")

    # Priority 2: Practitioner's default schedule
    if not named_schedules or not named_schedules.exists():
        named_schedules = Schedule.objects.filter(
            practitioner=practitioner,
            is_default=True,
            is_active=True
        ).prefetch_related('time_slots')
        if named_schedules.exists():
            logger.info(f"[Availability] Using practitioner default schedule: {named_schedules.first().name}")

    # Priority 3: Any active schedule for this practitioner
    if not named_schedules or not named_schedules.exists():
        named_schedules = Schedule.objects.filter(
            practitioner=practitioner,
            is_active=True
        ).prefetch_related('time_slots').order_by('-created_at')[:1]
        if named_schedules.exists():
            logger.info(f"[Availability] Using first active schedule: {named_schedules.first().name}")

    if named_schedules and named_schedules.exists():
        # ── Process named schedules ───────────────────────────────────
        for schedule in named_schedules:
            schedule_tz = practitioner_timezone
            if hasattr(schedule, 'timezone') and schedule.timezone:
                try:
                    schedule_tz = pytz.timezone(schedule.timezone)
                except pytz.exceptions.UnknownTimeZoneError:
                    pass

            # Count how many time slots this schedule has
            active_slots_count = schedule.time_slots.filter(is_active=True).count()
            logger.info(
                f"[Availability] Schedule '{schedule.name}' has {active_slots_count} active time slots"
            )

            for current_date in _date_range(start_date, end_date):
                if current_date.isoformat() in holidays:
                    continue

                weekday = current_date.weekday()
                day_slots = schedule.time_slots.filter(day=weekday, is_active=True)

                for slot in day_slots:
                    generated = _generate_time_slots(
                        current_date, slot.start_time, slot.end_time,
                        total_duration, service_id, schedule_tz,
                        schedule.id, schedule.name
                    )
                    available_slots.extend(generated)
    else:
        # ── Fallback: ServiceSchedule records ─────────────────────────
        svc_schedules = ServiceSchedule.objects.filter(
            practitioner=practitioner,
            service=service,
            is_active=True
        )
        svc_availability = ScheduleAvailability.objects.filter(
            practitioner=practitioner,
            service_schedule__service=service,
            date__gte=start_date,
            date__lte=end_date,
            is_active=True
        )

        svc_count = svc_schedules.count()
        avail_count = svc_availability.count()
        logger.info(
            f"[Availability] No named schedules. Fallback: {svc_count} ServiceSchedules, "
            f"{avail_count} ScheduleAvailability records"
        )

        if svc_count == 0 and avail_count == 0:
            logger.warning(
                f"[Availability] NO SCHEDULE DATA FOUND for practitioner {practitioner.id} / "
                f"service {service_id}. The practitioner needs to set up their availability."
            )
            return []

        for current_date in _date_range(start_date, end_date):
            if current_date.isoformat() in holidays:
                continue

            weekday = current_date.weekday()
            date_avail = svc_availability.filter(date=current_date)

            if date_avail.exists():
                for avail in date_avail:
                    generated = _generate_time_slots(
                        current_date, avail.start_time, avail.end_time,
                        total_duration, service_id, practitioner_timezone
                    )
                    available_slots.extend(generated)
            else:
                for sched in svc_schedules.filter(day=weekday):
                    generated = _generate_time_slots(
                        current_date, sched.start_time, sched.end_time,
                        total_duration, service_id, practitioner_timezone
                    )
                    available_slots.extend(generated)

    logger.info(f"[Availability] Generated {len(available_slots)} raw slots before filtering")

    if not available_slots:
        return []

    # ── Step 7: Deduplicate ───────────────────────────────────────────────
    unique = {}
    for slot in available_slots:
        key = slot['start_datetime'].isoformat()
        if key not in unique:
            unique[key] = slot
    available_slots = list(unique.values())

    # ── Step 8: Filter out booked slots ───────────────────────────────────
    filtered = _filter_booked_slots(available_slots, practitioner, service_duration)
    logger.info(f"[Availability] After booking filter: {len(filtered)} slots (removed {len(available_slots) - len(filtered)})")

    # ── Step 9: Filter out past slots + apply hours buffer ────────────────
    buffer_cutoff = now + timedelta(hours=buffer_hours)
    filtered = [s for s in filtered if s['start_datetime'] > buffer_cutoff]
    logger.info(f"[Availability] After time buffer ({buffer_hours}h): {len(filtered)} slots")

    # ── Step 10: Sort and return ──────────────────────────────────────────
    filtered.sort(key=lambda x: x['start_datetime'])
    return filtered


# ── Helper: Generate time slots ──────────────────────────────────────────────

def _generate_time_slots(
    date_obj: date,
    start_time: time,
    end_time: time,
    duration_minutes: int,
    service_id: int,
    tz=pytz.UTC,
    schedule_id=None,
    schedule_name=None
) -> List[Dict[str, Any]]:
    """Generate 15-minute interval time slots for a given date and time window."""
    if not date_obj or not start_time or not end_time:
        logger.warning(f"[Availability] Invalid slot inputs: date={date_obj}, start={start_time}, end={end_time}")
        return []

    slots = []
    try:
        start_dt = tz.localize(datetime.combine(date_obj, start_time))
        end_dt = tz.localize(datetime.combine(date_obj, end_time))

        # Handle overnight schedules (end_time < start_time means next day)
        if end_dt <= start_dt:
            end_dt += timedelta(days=1)

        # Convert to UTC for consistent comparison
        start_utc = start_dt.astimezone(pytz.UTC)
        end_utc = end_dt.astimezone(pytz.UTC)

        interval = timedelta(minutes=15)
        current = start_utc

        while current + timedelta(minutes=duration_minutes) <= end_utc:
            slot_end = current + timedelta(minutes=duration_minutes)
            slots.append({
                'start_datetime': current,
                'end_datetime': slot_end,
                'date': date_obj,  # Keep original date for grouping (not UTC date)
                'day': date_obj.weekday(),
                'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][date_obj.weekday()],
                'start_time': current.time(),
                'end_time': slot_end.time(),
                'is_available': True,
                'service_id': service_id,
                'schedule_id': schedule_id,
                'schedule_name': schedule_name
            })
            current += interval
    except Exception as e:
        logger.error(f"[Availability] Error generating slots for {date_obj}: {e}", exc_info=True)

    return slots


# ── Helper: Filter booked slots ──────────────────────────────────────────────

def _filter_booked_slots(
    slots: List[Dict[str, Any]],
    practitioner: Practitioner,
    duration_minutes: int
) -> List[Dict[str, Any]]:
    """Remove slots that overlap with existing confirmed/pending bookings."""
    if not slots:
        return []

    try:
        from bookings.models import Booking

        slot_dates = [s['date'] for s in slots]
        min_date = min(slot_dates)
        max_date = max(slot_dates)

        # Query bookings for this practitioner in the date range
        bookings = Booking.objects.filter(
            service__primary_practitioner=practitioner,
            service_session__start_time__date__gte=min_date,
            service_session__start_time__date__lte=max_date,
            status__in=['confirmed', 'pending']
        ).select_related('service_session', 'service')

        # Build booking time ranges
        booking_ranges = []
        for booking in bookings:
            b_start = booking.get_start_time()
            if b_start is None:
                continue

            b_end = booking.get_end_time()
            if b_end is None:
                b_duration = getattr(booking.service, 'duration_minutes', 60) or 60
                b_end = b_start + timedelta(minutes=b_duration)

            # Apply practitioner buffer around bookings
            buffer = timedelta(minutes=getattr(practitioner, 'buffer_time', 0) or 0)
            booking_ranges.append((b_start - buffer, b_end + buffer))

        # Filter
        return [
            slot for slot in slots
            if not any(
                slot['start_datetime'] < b_end and slot['end_datetime'] > b_start
                for b_start, b_end in booking_ranges
            )
        ]
    except Exception as e:
        logger.error(f"[Availability] Error filtering bookings: {e}", exc_info=True)
        return slots  # Return unfiltered on error — better than hiding all slots


# ── Helper: Date range generator ─────────────────────────────────────────────

def _date_range(start_date: date, end_date: date) -> List[date]:
    """Generate inclusive date range."""
    delta = (end_date - start_date).days + 1
    return [start_date + timedelta(days=i) for i in range(max(0, delta))]
