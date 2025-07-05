"""
Test if task results are being saved to database.
"""
from django.core.management.base import BaseCommand
from celery import current_app
from celery.result import AsyncResult
from django_celery_results.models import TaskResult
import json


class Command(BaseCommand):
    help = 'Test task result storage'

    def handle(self, *args, **options):
        self.stdout.write("🧪 Testing Task Result Storage")
        self.stdout.write("=" * 50)
        
        # 1. Check Celery configuration
        self.stdout.write("\n📋 Celery Configuration:")
        self.stdout.write(f"Result backend: {current_app.conf.result_backend}")
        self.stdout.write(f"Result persistent: {current_app.conf.result_persistent}")
        self.stdout.write(f"Task track started: {current_app.conf.task_track_started}")
        
        # 2. Check existing task results
        self.stdout.write("\n📊 Existing Task Results:")
        count = TaskResult.objects.count()
        self.stdout.write(f"Total task results in database: {count}")
        
        if count > 0:
            recent = TaskResult.objects.order_by('-date_done')[:5]
            for result in recent:
                self.stdout.write(f"  - {result.task_name}: {result.status} at {result.date_done}")
        
        # 3. Create a simple test task
        self.stdout.write("\n🧪 Creating Test Task...")
        
        @current_app.task
        def test_task():
            return {"test": "success", "timestamp": str(timezone.now())}
        
        # 4. Execute the test task
        try:
            from django.utils import timezone
            result = test_task.delay()
            self.stdout.write(f"✅ Task submitted: {result.id}")
            
            # Wait for result
            self.stdout.write("⏳ Waiting for result...")
            task_result = result.get(timeout=5)
            self.stdout.write(f"✅ Task completed: {task_result}")
            
            # Check if saved to database
            import time
            time.sleep(1)  # Give it a moment to save
            
            try:
                db_result = TaskResult.objects.get(task_id=result.id)
                self.stdout.write(f"✅ Result saved to database!")
                self.stdout.write(f"   Status: {db_result.status}")
                self.stdout.write(f"   Result: {db_result.result}")
            except TaskResult.DoesNotExist:
                self.stdout.write("❌ Result NOT saved to database!")
                self.stdout.write("   This means results backend is not configured correctly")
                
        except Exception as e:
            self.stdout.write(f"❌ Test failed: {str(e)}")
            
        # 5. Check if our cron task has results
        self.stdout.write("\n📋 Checking Cron Task Results:")
        cron_results = TaskResult.objects.filter(
            task_name='notifications.cron.process_all_notifications'
        ).order_by('-date_done')[:5]
        
        if cron_results:
            self.stdout.write(f"✅ Found {cron_results.count()} cron task results")
            for result in cron_results:
                self.stdout.write(f"  - {result.date_done}: {result.status}")
        else:
            self.stdout.write("❌ No cron task results found")
            
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("🎯 Diagnosis Complete!")