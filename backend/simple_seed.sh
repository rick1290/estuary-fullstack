#!/bin/bash
# Simple seeding script for Docker

echo "🌱 Seeding Estuary Database..."

# Copy the test script to container
docker cp test_current_seed.py estuary-fullstack-admin-1:/app/

# Run it
docker exec estuary-fullstack-admin-1 python /app/test_current_seed.py

echo "✅ Done!"
echo ""
echo "Test credentials:"
echo "  Admin: admin@estuary.com / admin123"
echo "  Users: testuser1@example.com / test123"
echo "  Practitioners: testpractitioner1@example.com / test123"