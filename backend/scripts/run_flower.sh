#!/bin/bash
# Script to run Flower (Celery monitoring)

echo "Starting Flower monitoring dashboard..."

# Set environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Get Flower auth from environment or use default
FLOWER_AUTH=${FLOWER_BASIC_AUTH:-"admin:admin"}

# Run Flower with basic auth
celery -A estuary flower \
    --port=${FLOWER_PORT:-5555} \
    --basic_auth=$FLOWER_AUTH \
    --url_prefix=flower