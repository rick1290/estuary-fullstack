#!/bin/bash
# Script to run Celery worker

echo "Starting Celery worker..."

# Set environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run Celery worker with proper configuration
celery -A estuary worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=default,notifications,payments \
    --hostname=worker@%h \
    --max-tasks-per-child=1000 \
    --time-limit=600 \
    --soft-time-limit=300