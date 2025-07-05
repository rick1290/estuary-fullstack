"""
Management command to set up the new cron-based notification tasks.
"""
from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule


class Command(BaseCommand):
    help = 'Set up the new cron-based notification tasks'

    def handle(self, *args, **options):
        self.stdout.write("🔧 Setting up cron-based notification tasks...")
        
        # 1. Disable old task
        try:
            old_task = PeriodicTask.objects.get(name='process-scheduled-notifications')
            old_task.enabled = False
            old_task.save()
            self.stdout.write("✅ Disabled old process-scheduled-notifications task")
        except PeriodicTask.DoesNotExist:
            self.stdout.write("ℹ️  Old process-scheduled-notifications task not found")
        
        # 2. Create new crontab schedule (every 15 minutes)
        schedule, created = CrontabSchedule.objects.get_or_create(
            minute='*/15',
            hour='*',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
        )
        if created:
            self.stdout.write("✅ Created new crontab schedule: */15 * * * *")
        else:
            self.stdout.write("ℹ️  Crontab schedule already exists: */15 * * * *")
        
        # 3. Create new periodic task
        task, created = PeriodicTask.objects.get_or_create(
            name='process-all-notifications',
            defaults={
                'task': 'notifications.cron.process_all_notifications',
                'crontab': schedule,
                'enabled': True,
            }
        )
        
        if created:
            self.stdout.write("✅ Created new process-all-notifications task")
        else:
            # Update existing task
            task.task = 'notifications.cron.process_all_notifications'
            task.crontab = schedule
            task.enabled = True
            task.save()
            self.stdout.write("✅ Updated existing process-all-notifications task")
        
        self.stdout.write("")
        self.stdout.write("🎉 Cron task setup complete!")
        self.stdout.write("📋 Summary:")
        self.stdout.write(f"  - Old task disabled: process-scheduled-notifications")
        self.stdout.write(f"  - New task active: process-all-notifications")
        self.stdout.write(f"  - Schedule: Every 15 minutes (*/15 * * * *)")
        self.stdout.write("")
        self.stdout.write("💡 You can now check Django Admin → Periodic Tasks to verify")