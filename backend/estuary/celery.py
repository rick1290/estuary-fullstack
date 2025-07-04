"""
Celery configuration for Estuary.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')

app = Celery('estuary')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat Schedule
app.conf.beat_schedule = {
    # Process scheduled notifications every minute
    'process-scheduled-notifications': {
        'task': 'notifications.tasks.process_scheduled_notifications',
        'schedule': 60.0,  # Every 60 seconds
        'options': {
            'expires': 30.0,  # Task expires after 30 seconds if not executed
        }
    },
    
    # Clean up old notifications daily at 2 AM
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=2, minute=0),
        'options': {
            'expires': 3600.0,  # Task expires after 1 hour
        }
    },
    
    # Send practitioner earnings summaries every Monday at 9 AM
    'send-practitioner-earnings-summaries': {
        'task': 'notifications.tasks.send_practitioner_earnings_summaries',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday = 1
        'options': {
            'expires': 3600.0,
        }
    },
    
    # Process Temporal workflows (if needed)
    'check-temporal-workflows': {
        'task': 'workflows.tasks.check_pending_workflows',
        'schedule': 300.0,  # Every 5 minutes
        'options': {
            'expires': 240.0,
        }
    },
    
    # Update stream post analytics
    'update-stream-analytics': {
        'task': 'streams.tasks.update_stream_analytics',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
        'options': {
            'expires': 1800.0,
        }
    },
    
    # Check for expired credits
    'expire-unused-credits': {
        'task': 'payments.tasks.expire_unused_credits',
        'schedule': crontab(hour=0, minute=30),  # Daily at 12:30 AM
        'options': {
            'expires': 3600.0,
        }
    },
    
    # Generate payout reports for practitioners
    'generate-weekly-payouts': {
        'task': 'payments.tasks.generate_weekly_payouts',
        'schedule': crontab(hour=10, minute=0, day_of_week=1),  # Monday 10 AM
        'options': {
            'expires': 3600.0,
        }
    },
}

# Celery Configuration
app.conf.update(
    # Broker settings
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,
    result_compression='gzip',
    
    # Task execution settings
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,  # 10 minutes hard limit
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Beat settings
    beat_scheduler='django_celery_beat.schedulers:DatabaseScheduler',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f'Request: {self.request!r}')