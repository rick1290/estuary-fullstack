#!/bin/bash
# Docker-specific database seeding script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="${DJANGO_CONTAINER:-estuary-fullstack-admin-1}"
MANAGE_CMD="python manage.py"

# Functions
print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Estuary Database Seeding Tool${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        print_error "Container $CONTAINER_NAME is not running!"
        echo "Please start your Docker containers first:"
        echo "  docker-compose up -d"
        exit 1
    fi
    print_success "Container $CONTAINER_NAME is running"
}

exec_in_container() {
    docker exec "$CONTAINER_NAME" $@
}

wait_for_db() {
    echo -e "${YELLOW}Waiting for database...${NC}"
    exec_in_container $MANAGE_CMD wait_for_db
    print_success "Database is ready"
}

run_migrations() {
    echo -e "${YELLOW}Running migrations...${NC}"
    exec_in_container $MANAGE_CMD migrate
    print_success "Migrations completed"
}

clear_database() {
    echo -e "${YELLOW}Clearing database...${NC}"
    exec_in_container $MANAGE_CMD clear_db --yes
    print_success "Database cleared"
}

seed_database() {
    local users=${1:-20}
    local practitioners=${2:-10}
    
    echo -e "${YELLOW}Seeding database...${NC}"
    echo "  - Users: $users"
    echo "  - Practitioners: $practitioners"
    
    exec_in_container $MANAGE_CMD seed_db --users $users --practitioners $practitioners
    print_success "Database seeded successfully"
}

show_credentials() {
    echo
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  Test Credentials${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo
    echo "Admin Panel: http://localhost:8000/admin/"
    echo "  Email: admin@estuary.com"
    echo "  Password: adminpass123"
    echo
    echo "Test Users:"
    echo "  user1@example.com / testpass123"
    echo "  user2@example.com / testpass123"
    echo "  ..."
    echo
    echo "Test Practitioners:"
    echo "  practitioner1@example.com / testpass123"
    echo "  practitioner2@example.com / testpass123"
    echo "  ..."
    echo
    echo -e "${YELLOW}All users have password: testpass123${NC}"
}

show_menu() {
    echo
    echo "What would you like to do?"
    echo "  1) Seed database (default data)"
    echo "  2) Seed database (custom amounts)"
    echo "  3) Reset database (clear + seed)"
    echo "  4) Clear database only"
    echo "  5) Run migrations only"
    echo "  6) Exit"
    echo
    read -p "Enter your choice [1-6]: " choice
}

# Main script
print_header
check_container
wait_for_db

if [ "$1" == "--reset" ]; then
    # Direct reset command
    clear_database
    run_migrations
    seed_database
    show_credentials
    exit 0
elif [ "$1" == "--seed" ]; then
    # Direct seed command
    seed_database $2 $3
    show_credentials
    exit 0
elif [ "$1" == "--clear" ]; then
    # Direct clear command
    clear_database
    exit 0
fi

# Interactive menu
while true; do
    show_menu
    
    case $choice in
        1)
            seed_database
            show_credentials
            break
            ;;
        2)
            read -p "Number of users [20]: " num_users
            read -p "Number of practitioners [10]: " num_practitioners
            num_users=${num_users:-20}
            num_practitioners=${num_practitioners:-10}
            seed_database $num_users $num_practitioners
            show_credentials
            break
            ;;
        3)
            print_warning "This will delete all data and reseed the database!"
            read -p "Are you sure? [y/N]: " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                clear_database
                run_migrations
                seed_database
                show_credentials
            else
                echo "Cancelled."
            fi
            break
            ;;
        4)
            print_warning "This will delete all data from the database!"
            read -p "Are you sure? [y/N]: " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                clear_database
            else
                echo "Cancelled."
            fi
            break
            ;;
        5)
            run_migrations
            break
            ;;
        6)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please try again."
            ;;
    esac
done

echo
print_success "Done!"