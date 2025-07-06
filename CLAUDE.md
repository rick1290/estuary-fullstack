- Booking System Overview:
  * Marketplace model with multiple booking types: sessions, workshops, courses
  * Booking Flow:
    - User can purchase different service types
    - Sessions: Choose available time slot
    - Workshops: Select specific time
    - Courses: Typically have predefined times
  * Financial Tracking:
    - Purchase triggers credit allocation
    - Credits tracked for practitioners
    - Payout mechanism needed for practitioners
  * Key Components:
    - Availability management
    - Time slot selection
    - Purchase processing
    - Credit tracking
    - Practitioner compensation system

- Room Access System (Video Conferencing):
  * Unified URL pattern: /room/{room-uuid}/lobby
  * Single backend endpoint handles all permission checks
  * Access types:
    - Individual sessions: Booking → Room
    - Workshops: Booking → ServiceSession → Room
    - Courses: Booking → Service → ServiceSession → Room
  * Backend endpoint: GET /api/v1/rooms/{uuid}/check_access/
  * Returns: can_join, role (host/participant), reason if denied
  * See: /frontend-2/docs/room-access-system.md for details