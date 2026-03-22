#!/usr/bin/env bash
# Render build script for the backend
# Set this as the Build Command in Render dashboard:
#   cd backend && chmod +x scripts/build.sh && ./scripts/build.sh

set -o errexit  # exit on error

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate --noinput
