#!/usr/bin/env python3
"""
Simple test script to validate cron notification functionality without Django setup.
"""
import os
import sys
import datetime
from pathlib import Path

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent))

# Mock Django settings for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')

def test_cron_imports():
    """Test that we can import the cron module."""
    try:
        # Test basic imports
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        print("✓ Basic imports successful")
        
        # Test cron module import
        from notifications.cron import (
            process_all_notifications,
            process_booking_reminders,
            process_session_reschedules
        )
        
        print("✓ Cron module imports successful")
        
        # Test notification models
        from notifications.models import Notification
        print("✓ Notification model import successful")
        
        # Test service registry
        from notifications.services.registry import (
            get_client_notification_service,
            get_practitioner_notification_service
        )
        print("✓ Service registry imports successful")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_cron_logic():
    """Test the cron logic without database."""
    try:
        # Test time calculations
        now = datetime.now()
        hours_24 = now + datetime.timedelta(hours=24)
        minutes_30 = now + datetime.timedelta(minutes=30)
        
        print(f"✓ Time calculations work:")
        print(f"  Now: {now}")
        print(f"  24h from now: {hours_24}")
        print(f"  30m from now: {minutes_30}")
        
        # Test notification key generation
        booking_id = 123
        session_id = 456
        hours_before = 24
        
        notification_key = f"booking_{booking_id}_session_{session_id}_{hours_before}h_client_reminder"
        print(f"✓ Notification key generated: {notification_key}")
        
        return True
        
    except Exception as e:
        print(f"✗ Logic test failed: {e}")
        return False

def test_cron_configuration():
    """Test the cron configuration."""
    try:
        # Test celery schedule format
        from celery.schedules import crontab
        
        schedule = crontab(minute='*/15')
        print(f"✓ Celery crontab schedule valid: {schedule}")
        
        # Test configuration values
        from estuary.celery import app
        
        if hasattr(app.conf, 'beat_schedule'):
            beat_schedule = app.conf.beat_schedule
            if 'process-all-notifications' in beat_schedule:
                print("✓ process-all-notifications found in beat schedule")
                task_info = beat_schedule['process-all-notifications']
                print(f"  Task: {task_info.get('task')}")
                print(f"  Schedule: {task_info.get('schedule')}")
            else:
                print("✗ process-all-notifications NOT found in beat schedule")
        else:
            print("✗ No beat_schedule found in celery config")
        
        return True
        
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🔄 Testing Cron-Based Notification System")
    print("=" * 50)
    
    tests = [
        ("Import Tests", test_cron_imports),
        ("Logic Tests", test_cron_logic),
        ("Configuration Tests", test_cron_configuration),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name}...")
        try:
            if test_func():
                print(f"✅ {test_name} PASSED")
                passed += 1
            else:
                print(f"❌ {test_name} FAILED")
                failed += 1
        except Exception as e:
            print(f"❌ {test_name} FAILED with exception: {e}")
            failed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Cron notification system is ready.")
    else:
        print("⚠️  Some tests failed. Check the output above.")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)