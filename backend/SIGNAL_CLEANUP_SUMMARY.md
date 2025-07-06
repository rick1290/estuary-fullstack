# Signal Cleanup Summary

## Overview
We've significantly reduced the use of Django signals in favor of explicit service calls, improving code clarity and reducing hidden side effects.

## Signals Removed/Deprecated

### In `notifications/signals.py`:
1. **Booking Notifications** - Removed duplicate booking confirmation/cancellation notifications
   - Now handled by: `BookingService.create_booking()`
   
2. **Payment Notifications** - Removed Order payment success notifications
   - Now handled by: `PaymentService` and `CheckoutOrchestrator`
   
3. **Credit Notifications** - Removed credit purchase notifications
   - Now handled by: `CreditService.purchase_credits()`
   
4. **Service Creation Notifications** - Removed automatic notifications
   - Should be explicit when service is created via API
   
5. **Review Notifications** - Removed automatic notifications
   - Should be explicit when review is created via API
   
6. **Message Notifications** - Removed automatic notifications
   - Should be handled by messaging service explicitly

### In `payments/signals.py`:
1. **Earnings Creation** - Removed automatic earnings creation on booking completion
   - Now handled by: `EarningsService.create_booking_earnings()` called by `CheckoutOrchestrator`

### In `rooms/signals.py`:
1. **Room Creation** - Commented out automatic room creation for bookings
   - Now handled by: `BookingService.create_booking()` calling `RoomService.create_room_for_booking()`

## Signals Kept

### Essential Signals:
1. **User Welcome Emails** (`notifications/signals.py`) - For new user registration
2. **Practitioner Welcome & Onboarding** (`notifications/signals.py`) - For new practitioners
3. **Booking Completion Review Requests** (`notifications/signals.py`) - Edge case for completed bookings
4. **Payout Status Notifications** (`notifications/signals.py`) - TODO: Move to PayoutService
5. **Package Completion Tracking** (`payments/signals.py`) - Needs to track status changes

### Pre-save Trackers:
- Booking status tracking (both files) - Used to detect status changes

## Benefits of This Approach

1. **Explicit Control**: Services explicitly call notification/payment logic
2. **No Hidden Side Effects**: Developers can see exactly what happens in the service
3. **Better Testing**: Services can be unit tested without triggering signals
4. **Easier Debugging**: Clear call stack, no mysterious signal handlers
5. **Performance**: No unnecessary signal handlers firing

## Migration Pattern

### Before (Signal):
```python
@receiver(post_save, sender=Booking)
def send_booking_notification(sender, instance, created, **kwargs):
    if created and instance.status == 'confirmed':
        send_notification(instance)
```

### After (Service):
```python
class BookingService:
    def create_booking(self, ...):
        booking = Booking.objects.create(...)
        if booking.status == 'confirmed':
            self.notification_service.send_booking_confirmation(booking)
        return booking
```

## Guidelines Going Forward

1. **Use Services for Business Logic**: All business logic should be in service classes
2. **Signals Only for Cross-Cutting Concerns**: Only use signals for truly cross-cutting concerns
3. **Explicit Over Implicit**: Always prefer explicit method calls over signals
4. **Document Signal Usage**: Any remaining signals should be well-documented
5. **Consider Alternatives**: Before adding a signal, consider if a service method would be clearer