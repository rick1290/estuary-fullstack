"""
Management command to clean up old/unused periodic tasks.
"""
from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask


class Command(BaseCommand):
    help = 'Clean up unused periodic tasks from database'

    def handle(self, *args, **options):
        self.stdout.write("🧹 Cleaning up periodic tasks...")
        
        # Tasks to remove (no longer used)
        tasks_to_remove = [
            'check-temporal-workflows',
            'update-stream-analytics',
        ]
        
        for task_name in tasks_to_remove:
            try:
                task = PeriodicTask.objects.get(name=task_name)
                task.delete()
                self.stdout.write(f"✅ Deleted: {task_name}")
            except PeriodicTask.DoesNotExist:
                self.stdout.write(f"ℹ️  Not found: {task_name} (already removed)")
        
        # List remaining active tasks
        self.stdout.write("\n📋 Active Periodic Tasks:")
        active_tasks = PeriodicTask.objects.filter(enabled=True)
        
        for task in active_tasks:
            self.stdout.write(f"✅ {task.name}")
            self.stdout.write(f"   Task: {task.task}")
            self.stdout.write(f"   Schedule: {task.crontab or task.interval}")
            self.stdout.write(f"   Last run: {task.last_run_at}")
            self.stdout.write("")
        
        self.stdout.write(f"\n🎯 Total active tasks: {active_tasks.count()}")
        self.stdout.write("✅ Cleanup complete!")