#!/bin/bash
# Simple database seeding for Docker development

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🌱 Estuary Database Seeding Tool${NC}"
echo "================================="
echo

# Function to execute in container
exec_cmd() {
    docker exec estuary-fullstack-admin-1 $@
}

# Function to create test data
seed_data() {
    echo -e "${YELLOW}Creating test data...${NC}"
    
    # Create test data using Django shell
    exec_cmd python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
from django.db import transaction
import random

User = get_user_model()

print("Creating test users...")

# Create admin if doesn't exist
admin, created = User.objects.get_or_create(
    email='admin@estuary.com',
    defaults={
        'first_name': 'Admin',
        'last_name': 'User',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True
    }
)
if created:
    admin.set_password('admin123')
    admin.save()
    print("✓ Created admin user: admin@estuary.com / admin123")

# Create test users
for i in range(1, 6):
    user, created = User.objects.get_or_create(
        email=f'user{i}@example.com',
        defaults={
            'first_name': f'User{i}',
            'last_name': 'Test',
            'is_active': True
        }
    )
    if created:
        user.set_password('test123')
        user.save()
        print(f"✓ Created user{i}@example.com / test123")

# Create test practitioners
for i in range(1, 4):
    user, created = User.objects.get_or_create(
        email=f'practitioner{i}@example.com',
        defaults={
            'first_name': f'Practitioner{i}',
            'last_name': 'Test',
            'is_active': True,
            'is_practitioner': True
        }
    )
    if created:
        user.set_password('test123')
        user.save()
        print(f"✓ Created practitioner{i}@example.com / test123")

print("\nDatabase seeded successfully!")
print(f"Total users: {User.objects.count()}")
EOF

    echo -e "${GREEN}✅ Seeding complete!${NC}"
}

# Function to clear data
clear_data() {
    echo -e "${RED}⚠️  This will delete all data!${NC}"
    read -p "Are you sure? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Clearing database...${NC}"
        exec_cmd python manage.py flush --no-input
        echo -e "${GREEN}✅ Database cleared!${NC}"
    else
        echo "Cancelled."
    fi
}

# Main menu
case "${1:-menu}" in
    seed)
        seed_data
        ;;
    clear)
        clear_data
        ;;
    reset)
        clear_data
        seed_data
        ;;
    *)
        echo "Usage: $0 {seed|clear|reset}"
        echo
        echo "Commands:"
        echo "  seed   - Add test data to database"
        echo "  clear  - Clear all data from database"
        echo "  reset  - Clear and reseed database"
        echo
        echo "Example:"
        echo "  $0 seed"
        ;;
esac