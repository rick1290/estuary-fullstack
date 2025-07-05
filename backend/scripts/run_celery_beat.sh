#!/bin/bash
# Script to run Celery beat (scheduler)

echo "Starting Celery beat scheduler..."

# Set environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run Celery beat with database scheduler
celery -A estuary beat \
    --loglevel=info \
    --scheduler=django_celery_beat.schedulers:DatabaseScheduler