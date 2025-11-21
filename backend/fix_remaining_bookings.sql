-- Diagnostic queries to investigate the 68 bookings without service_session

-- 1. Check what types of bookings are missing service_session
SELECT
    status,
    is_package_purchase,
    is_bundle_purchase,
    COUNT(*) as count,
    COUNT(CASE WHEN start_time IS NULL THEN 1 END) as null_start_time,
    COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as has_start_time
FROM bookings_booking
WHERE service_session_id IS NULL
GROUP BY status, is_package_purchase, is_bundle_purchase
ORDER BY count DESC;

-- 2. Detailed view of problematic bookings
SELECT
    id,
    status,
    service_id,
    start_time,
    end_time,
    is_package_purchase,
    is_bundle_purchase,
    created_at
FROM bookings_booking
WHERE service_session_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if these bookings have corresponding ServiceSessions
-- (maybe they exist but aren't linked)
SELECT
    b.id as booking_id,
    b.service_id,
    b.start_time,
    ss.id as session_id,
    ss.start_time as session_start
FROM bookings_booking b
LEFT JOIN services_servicesession ss ON (
    ss.service_id = b.service_id
    AND ss.start_time = b.start_time
)
WHERE b.service_session_id IS NULL
    AND b.start_time IS NOT NULL
LIMIT 20;

-- 4. Count by service type
SELECT
    st.code as service_type,
    COUNT(*) as bookings_without_session
FROM bookings_booking b
JOIN services_service s ON s.id = b.service_id
LEFT JOIN services_servicetype st ON st.id = s.service_type_id
WHERE b.service_session_id IS NULL
GROUP BY st.code;
