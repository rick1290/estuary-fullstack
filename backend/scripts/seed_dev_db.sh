#!/bin/bash

# Script to seed the development database with test data
# Usage: ./scripts/seed_dev_db.sh

echo "=== Database Seeding Script ==="
echo ""
echo "This script will help you manage your development database."
echo ""
echo "Options:"
echo "1. Clear all data (dangerous!)"
echo "2. Seed database with test data"
echo "3. Reset database (clear + seed)"
echo "4. Exit"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "Clearing database..."
        python manage.py clear_db
        ;;
    2)
        echo "Seeding database with test data..."
        read -p "Number of users to create (default 20): " users
        read -p "Number of practitioners to create (default 10): " practitioners
        
        users=${users:-20}
        practitioners=${practitioners:-10}
        
        python manage.py seed_db --users $users --practitioners $practitioners
        ;;
    3)
        echo "Resetting database (clear + seed)..."
        read -p "Number of users to create (default 20): " users
        read -p "Number of practitioners to create (default 10): " practitioners
        
        users=${users:-20}
        practitioners=${practitioners:-10}
        
        python manage.py reset_db --users $users --practitioners $practitioners
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo ""
echo "Operation completed!"