# Makefile for easy database management in development

.PHONY: help seed reset clear db-shell test

help:
	@echo "Database Management Commands:"
	@echo "  make seed       - Seed the database with test data"
	@echo "  make reset      - Clear and reseed the database"
	@echo "  make clear      - Clear all data from database"
	@echo "  make db-shell   - Open database shell"
	@echo "  make test       - Run tests"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up         - Start all containers"
	@echo "  make down       - Stop all containers"
	@echo "  make logs       - View container logs"
	@echo "  make shell      - Open Django shell"

# Database commands
seed:
	@echo "Seeding database..."
	@docker exec estuary-fullstack-admin-1 python manage.py seed_db

reset:
	@echo "Resetting database (clear + seed)..."
	@docker exec estuary-fullstack-admin-1 python manage.py reset_db --yes

clear:
	@echo "Clearing database..."
	@docker exec estuary-fullstack-admin-1 python manage.py clear_db --yes

db-shell:
	@docker exec -it estuary-fullstack-admin-1 python manage.py dbshell

# Docker commands
up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

shell:
	@docker exec -it estuary-fullstack-admin-1 python manage.py shell

# Quick test
test:
	@echo "Testing API endpoints..."
	@curl -s http://localhost:8000/api/v1/ | python3 -m json.tool | head -10
	@echo "\nTesting services endpoint..."
	@curl -s http://localhost:8000/api/v1/services/ | python3 -m json.tool | grep -E '(count|status)' | head -5