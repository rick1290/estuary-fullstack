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
    # NEW: Master notification processing (reminders, reschedules, etc.)
    'process-all-notifications': {
        'task': 'notifications.cron.process_all_notifications',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
        'options': {
            'expires': 600.0,  # Task expires after 10 minutes if not executed
        }
    },
    
    # Process booking reminders every 5 minutes
    'process-booking-reminders': {
        'task': 'process-booking-reminders',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {
            'expires': 240.0,  # Task expires after 4 minutes if not executed
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
        'task': 'practitioners.tasks.send_practitioner_earnings_summaries',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday = 1
        'options': {
            'expires': 3600.0,
        }
    },
    
    # DISABLED: Temporal workflows (not using Temporal currently)
    # 'check-temporal-workflows': {
    #     'task': 'workflows.tasks.check_pending_workflows',
    #     'schedule': 300.0,  # Every 5 minutes
    #     'options': {
    #         'expires': 240.0,
    #     }
    # },
    
    # DISABLED: Stream analytics (implement when needed)
    # 'update-stream-analytics': {
    #     'task': 'streams.tasks.update_stream_analytics',
    #     'schedule': crontab(minute='*/30'),  # Every 30 minutes
    #     'options': {
    #         'expires': 1800.0,
    #     }
    # },
    
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
    
    # Mark completed bookings
    'mark-completed-bookings': {
        'task': 'bookings.tasks.mark_completed_bookings',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
        'options': {
            'expires': 1800.0,  # Task expires after 30 minutes
        }
    },
    
    # Update available earnings
    'update-available-earnings': {
        'task': 'payments.tasks.update_available_earnings',
        'schedule': crontab(minute=0),  # Every hour
        'options': {
            'expires': 3600.0,
        }
    },
    
    # Calculate pending earnings daily
    'calculate-pending-earnings': {
        'task': 'payments.tasks.calculate_pending_earnings',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
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
    result_backend='django-db',  # Use Django database as result backend
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,
    result_compression='gzip',
    task_track_started=True,  # Track when tasks start
    
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