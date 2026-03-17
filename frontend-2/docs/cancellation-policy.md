# Cancellation Policy — Business Rules

## Session (1:1)
- User cancels >24hrs before → 100% credit refund, ServiceSession canceled, calendar freed
- User cancels <24hrs before → 0% refund, booking canceled
- Practitioner cancels → 100% refund always

## Workshop
- User cancels >24hrs before → 100% credit refund, participant count decremented, spot opens
- User cancels <24hrs before → 0% refund, participant count still decremented
- Practitioner cancels → all participants get 100% refund

## Course
- User cancels within 14 days of first session → refund for remaining uncompleted sessions
- User cancels after 14 days → NOT ALLOWED (committed)
- Completed sessions stay accessible (recordings, notes)
- Practitioner cancels → 100% of remaining for all students

## Package
- Completed sessions → no refund (service delivered)
- Scheduled sessions >24hrs away → 100% refund
- Scheduled sessions <24hrs away → 0% refund
- Draft/unscheduled sessions → 100% refund always
- Practitioner cancels → 100% remaining

## Universal Rules
- No 6-hour tier — 24hr only
- Practitioner-initiated = always full refund
- payment_status updated to 'refunded' or 'partially_refunded'
- 1:1 ServiceSession gets status='canceled', shared sessions stay active
- Draft bookings always fully refundable
