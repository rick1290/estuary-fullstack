#!/usr/bin/env python
"""
Quick test script to verify Celery setup.
Run this after starting Celery worker and beat.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from notifications.tasks import test_celery
from celery import current_app
from django_celery_beat.models import PeriodicTask


def test_celery_connection():
    """Test Celery broker connection."""
    print("Testing Celery connection...")
    try:
        # Test broker connection
        conn = current_app.connection()
        conn.ensure_connection(max_retries=3)
        print("✓ Successfully connected to Celery broker")
        return True
    except Exception as e:
        print(f"✗ Failed to connect to Celery broker: {e}")
        return False


def test_celery_task():
    """Test executing a simple Celery task."""
    print("\nTesting Celery task execution...")
    try:
        # Send task
        result = test_celery.delay()
        print(f"✓ Task sent successfully. Task ID: {result.id}")
        
        # Wait for result
        print("Waiting for task result...")
        task_result = result.get(timeout=10)
        print(f"✓ Task completed successfully. Result: {task_result}")
        return True
    except Exception as e:
        print(f"✗ Task execution failed: {e}")
        return False


def check_periodic_tasks():
    """Check configured periodic tasks."""
    print("\nChecking periodic tasks...")
    try:
        tasks = PeriodicTask.objects.all()
        if tasks.exists():
            print(f"✓ Found {tasks.count()} periodic tasks:")
            for task in tasks:
                status = "Enabled" if task.enabled else "Disabled"
                print(f"  - {task.name}: {task.task} ({status})")
        else:
            print("! No periodic tasks configured yet")
        return True
    except Exception as e:
        print(f"✗ Error checking periodic tasks: {e}")
        return False


def check_celery_beat_schedule():
    """Check Celery Beat schedule configuration."""
    print("\nChecking Celery Beat schedule...")
    try:
        schedule = current_app.conf.beat_schedule
        if schedule:
            print(f"✓ Found {len(schedule)} scheduled tasks in configuration:")
            for name, config in schedule.items():
                print(f"  - {name}: {config['task']}")
        else:
            print("! No scheduled tasks in configuration")
        return True
    except Exception as e:
        print(f"✗ Error checking beat schedule: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 50)
    print("Celery Setup Test")
    print("=" * 50)
    
    tests = [
        test_celery_connection,
        test_celery_task,
        check_periodic_tasks,
        check_celery_beat_schedule,
    ]
    
    results = []
    for test in tests:
        results.append(test())
        print()
    
    # Summary
    print("=" * 50)
    print("Summary:")
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total} tests")
    
    if passed == total:
        print("\n✓ All tests passed! Celery is properly configured.")
        print("\nNext steps:")
        print("1. Create notification templates in Courier")
        print("2. Run: python manage.py setup_notification_preferences")
        print("3. Test notifications: python manage.py send_test_notification <user_id>")
    else:
        print("\n✗ Some tests failed. Please check the errors above.")
        print("\nMake sure:")
        print("1. Redis is running: redis-cli ping")
        print("2. Celery worker is running: ./scripts/run_celery_worker.sh")
        print("3. Celery beat is running: ./scripts/run_celery_beat.sh")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())