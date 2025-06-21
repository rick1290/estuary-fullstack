#!/bin/bash
# Test seeding script

echo "🧪 Testing database seeding..."
echo ""

# Run the quick seed command
echo "Running quick_seed command..."
docker exec estuary-fullstack-admin-1 python manage.py quick_seed

echo ""
echo "✅ Seeding complete!"
echo ""
echo "You can now login with:"
echo "  Admin: http://localhost:8000/admin/"
echo "  Email: admin@estuary.com"
echo "  Password: admin123"