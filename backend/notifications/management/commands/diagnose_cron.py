"""
Diagnostic command to check cron notification system health.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django_celery_results.models import TaskResult
from notifications.models import Notification
from notifications.cron import process_all_notifications


class Command(BaseCommand):
    help = 'Diagnose the cron notification system'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Diagnosing Cron Notification System")
        self.stdout.write("=" * 50)
        
        # 1. Check periodic task configuration
        self.check_periodic_task()
        
        # 2. Check recent task results
        self.check_task_results()
        
        # 3. Check recent notifications
        self.check_recent_notifications()
        
        # 4. Test the cron function directly
        self.test_cron_function()

    def check_periodic_task(self):
        self.stdout.write("\n📋 Checking Periodic Task Configuration...")
        
        try:
            task = PeriodicTask.objects.get(name='process-all-notifications')
            self.stdout.write(f"✅ Task found: {task.name}")
            self.stdout.write(f"  - Enabled: {task.enabled}")
            self.stdout.write(f"  - Task: {task.task}")
            self.stdout.write(f"  - Crontab: {task.crontab}")
            self.stdout.write(f"  - Last run: {task.last_run_at}")
            self.stdout.write(f"  - Total runs: {task.total_run_count}")
            
            if not task.enabled:
                self.stdout.write("⚠️  Task is DISABLED!")
                
        except PeriodicTask.DoesNotExist:
            self.stdout.write("❌ process-all-notifications task NOT FOUND!")
            self.stdout.write("   Run: python manage.py setup_cron_tasks")
            
        # Check old task
        try:
            old_task = PeriodicTask.objects.get(name='process-scheduled-notifications')
            if old_task.enabled:
                self.stdout.write("⚠️  OLD TASK STILL ENABLED: process-scheduled-notifications")
            else:
                self.stdout.write("✅ Old task properly disabled")
        except PeriodicTask.DoesNotExist:
            self.stdout.write("✅ Old task not found (good)")

    def check_task_results(self):
        self.stdout.write("\n📊 Checking Recent Task Results...")
        
        # Check for our specific task
        results = TaskResult.objects.filter(
            task_name='notifications.cron.process_all_notifications'
        ).order_by('-date_done')[:5]
        
        if results:
            self.stdout.write(f"✅ Found {results.count()} recent executions:")
            for result in results:
                status_icon = "✅" if result.status == "SUCCESS" else "❌"
                self.stdout.write(f"  {status_icon} {result.date_done}: {result.status}")
                if result.result:
                    self.stdout.write(f"     Result: {result.result}")
        else:
            self.stdout.write("❌ No task results found for process_all_notifications")
            
        # Check any recent celery results
        recent_results = TaskResult.objects.order_by('-date_done')[:3]
        if recent_results:
            self.stdout.write(f"\n📈 Most recent Celery tasks:")
            for result in recent_results:
                self.stdout.write(f"  - {result.task_name}: {result.status} at {result.date_done}")

    def check_recent_notifications(self):
        self.stdout.write("\n📧 Checking Recent Notifications...")
        
        # Check cron-generated notifications
        cron_notifications = Notification.objects.filter(
            notification_key__contains='reminder',
            created_at__gte=timezone.now() - timezone.timedelta(hours=2)
        ).order_by('-created_at')[:5]
        
        if cron_notifications:
            self.stdout.write(f"✅ Found {cron_notifications.count()} recent cron notifications:")
            for notif in cron_notifications:
                self.stdout.write(f"  - {notif.created_at}: {notif.notification_type} → {notif.user.email} ({notif.status})")
        else:
            self.stdout.write("❌ No recent cron notifications found")
            
        # Check total notifications
        total = Notification.objects.count()
        recent = Notification.objects.filter(
            created_at__gte=timezone.now() - timezone.timedelta(hours=1)
        ).count()
        self.stdout.write(f"📊 Total notifications: {total}, Recent (1h): {recent}")

    def test_cron_function(self):
        self.stdout.write("\n🧪 Testing Cron Function Directly...")
        
        try:
            self.stdout.write("Running process_all_notifications()...")
            result = process_all_notifications()
            self.stdout.write(f"✅ Function executed successfully!")
            self.stdout.write(f"📋 Result: {result}")
            
        except Exception as e:
            self.stdout.write(f"❌ Function failed: {str(e)}")
            import traceback
            self.stdout.write(traceback.format_exc())

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("🎯 Diagnosis Complete!")
        self.stdout.write("\nNext steps:")
        self.stdout.write("1. Check if Celery worker is running")
        self.stdout.write("2. Check if Celery beat is running")  
        self.stdout.write("3. Verify task queue configuration")
        self.stdout.write("4. Check application logs for errors")