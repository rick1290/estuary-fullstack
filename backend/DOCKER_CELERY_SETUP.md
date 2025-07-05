# Docker Celery Setup

## Overview

The Docker Compose configuration now includes:
- **celery-worker**: Processes async tasks
- **celery-beat**: Schedules periodic tasks
- **flower**: Web UI for monitoring Celery (port 5555)

## Quick Start with Docker

### 1. Update .env file
Add these variables to `backend/.env`:
```bash
# Redis (uses Docker service name)
REDIS_URL=redis://redis:6379/0

# Courier
COURIER_AUTH_TOKEN=your_courier_auth_token

# Flower Authentication
FLOWER_BASIC_AUTH=admin:securepassword
```

### 2. Build and Start Services
```bash
# Build/rebuild images
docker-compose build

# Start all services
docker-compose up -d

# Or start specific services
docker-compose up -d postgres redis admin celery-worker celery-beat flower
```

### 3. Run Migrations
```bash
# Run Celery migrations
docker-compose exec admin python manage.py migrate django_celery_beat
docker-compose exec admin python manage.py migrate django_celery_results

# Set up notification preferences
docker-compose exec admin python manage.py setup_notification_preferences
```

### 4. Test Celery
```bash
# Test Celery is working
docker-compose exec admin python test_celery_setup.py

# Send test notification
docker-compose exec admin python manage.py send_test_notification 1 --type=test_celery
```

## Service URLs

- **Django Admin**: http://localhost:8000/admin
- **API**: http://localhost:8001
- **Flower (Celery Monitor)**: http://localhost:5555
  - Login with credentials from FLOWER_BASIC_AUTH

## Docker Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific services
docker-compose logs -f celery-worker
docker-compose logs -f celery-beat
docker-compose logs -f flower
```

### Restart Services
```bash
# Restart Celery worker (e.g., after code changes)
docker-compose restart celery-worker

# Restart all Celery services
docker-compose restart celery-worker celery-beat flower
```

### Scale Workers
```bash
# Run 3 Celery workers
docker-compose up -d --scale celery-worker=3
```

### Debug Tasks
```bash
# Access Celery shell
docker-compose exec celery-worker celery -A estuary shell

# List registered tasks
docker-compose exec celery-worker celery -A estuary list

# Inspect active tasks
docker-compose exec celery-worker celery -A estuary inspect active

# Purge all tasks
docker-compose exec celery-worker celery -A estuary purge
```

## Production Considerations

### 1. Separate Redis Databases
Update docker-compose.yml to use different Redis databases:
```yaml
environment:
  - CELERY_BROKER_URL=redis://redis:6379/0  # Broker
  - CELERY_RESULT_BACKEND=redis://redis:6379/1  # Results
  - REDIS_URL=redis://redis:6379/2  # Django cache
```

### 2. Resource Limits
Add resource constraints:
```yaml
celery-worker:
  # ... existing config ...
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### 3. Health Checks
Add health checks to services:
```yaml
celery-worker:
  # ... existing config ...
  healthcheck:
    test: ["CMD", "celery", "-A", "estuary", "inspect", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 4. Persistent Storage
For Flower data persistence:
```yaml
volumes:
  flower-data:

services:
  flower:
    # ... existing config ...
    volumes:
      - flower-data:/data
    environment:
      - FLOWER_DB=/data/flower.db
```

## Troubleshooting

### Container Issues
```bash
# Check if containers are running
docker-compose ps

# Check container health
docker-compose ps | grep celery

# Restart unhealthy containers
docker-compose restart celery-worker celery-beat
```

### Connection Issues
```bash
# Test Redis connection from Django container
docker-compose exec admin python -c "import redis; r = redis.from_url('redis://redis:6379/0'); print(r.ping())"

# Test Celery connection
docker-compose exec admin python -c "from celery import current_app; print(current_app.control.inspect().stats())"
```

### Task Issues
```bash
# Check for task errors
docker-compose logs celery-worker | grep ERROR

# Monitor task execution
docker-compose exec celery-worker celery -A estuary events

# Check scheduled tasks
docker-compose exec admin python manage.py shell
>>> from django_celery_beat.models import PeriodicTask
>>> PeriodicTask.objects.all()
```

## Development Workflow

1. **Make code changes** to tasks in your local files
2. **Restart worker** to pick up changes:
   ```bash
   docker-compose restart celery-worker
   ```
3. **Test your changes**:
   ```bash
   docker-compose exec admin python manage.py shell
   >>> from myapp.tasks import my_task
   >>> my_task.delay()
   ```
4. **Monitor in Flower**: http://localhost:5555

## Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (careful - deletes data!)
docker-compose down -v

# Remove Celery-specific containers only
docker-compose rm -f celery-worker celery-beat flower
```