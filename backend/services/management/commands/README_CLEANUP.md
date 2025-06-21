# Draft Service Cleanup

## Overview
This management command cleans up abandoned draft services to prevent database clutter and orphaned media files.

## Usage

### Manual Execution
```bash
# Basic cleanup (24 hours old)
python manage.py cleanup_draft_services

# Custom time period
python manage.py cleanup_draft_services --hours 48

# Dry run (see what would be deleted)
python manage.py cleanup_draft_services --dry-run

# Keep drafts with media
python manage.py cleanup_draft_services --keep-with-media

# Keep drafts with sessions
python manage.py cleanup_draft_services --keep-with-sessions
```

### Automated Execution with Celery

Add to your Celery beat schedule:

```python
# In your Django settings or Celery config
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-draft-services': {
        'task': 'services.cleanup_draft_services',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'kwargs': {
            'hours': 24,
            'keep_with_media': True,
            'keep_with_sessions': True
        }
    },
}
```

### Direct Celery Task Execution
```python
from services.tasks import cleanup_draft_services

# Execute the task
cleanup_draft_services.delay(hours=24)
```

## Options

- `--hours`: Delete drafts older than this many hours (default: 24)
- `--dry-run`: Show what would be deleted without actually deleting
- `--keep-with-media`: Keep draft services that have associated media files
- `--keep-with-sessions`: Keep draft services that have associated sessions

## What Gets Cleaned

1. Services with status='draft'
2. Created more than X hours ago
3. Associated media files (deleted first)
4. The service record itself

## Safety Features

- Transactional deletion (all or nothing)
- Option to preserve drafts with content
- Dry run mode for testing
- Detailed logging of all operations

## Best Practices

1. Run with `--dry-run` first to verify
2. Keep the default 24-hour window for user convenience
3. Enable `--keep-with-media` to avoid losing uploaded content
4. Monitor logs for any deletion errors
5. Consider backing up before first run