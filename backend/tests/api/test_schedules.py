#!/usr/bin/env python3
"""
Test schedule creation with multiple schedules and availability patterns.
"""
import asyncio
import httpx
import json
from datetime import time

API_BASE_URL = "http://localhost:8001/api/v1"

async def test_schedule_creation():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("======================================================================")
        print("SCHEDULE CREATION TEST")
        print("======================================================================")
        
        # Login as practitioner
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": "practitioner@estuary.com", "password": "practitioner123"}
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✓ Practitioner login successful")
        else:
            print(f"✗ Login failed: {response.status_code}")
            return
        
        # 1. Create Default Schedule
        print("\n1. CREATE DEFAULT SCHEDULE")
        print("-" * 50)
        
        default_schedule = {
            "name": "Regular Hours",
            "description": "My standard working hours",
            "timezone": "America/Los_Angeles",
            "is_default": True,
            "is_active": True,
            "time_slots": [
                # Monday
                {"day": 0, "start_time": "09:00:00", "end_time": "17:00:00"},
                # Tuesday
                {"day": 1, "start_time": "09:00:00", "end_time": "17:00:00"},
                # Wednesday
                {"day": 2, "start_time": "09:00:00", "end_time": "17:00:00"},
                # Thursday
                {"day": 3, "start_time": "09:00:00", "end_time": "17:00:00"},
                # Friday
                {"day": 4, "start_time": "09:00:00", "end_time": "15:00:00"},
            ]
        }
        
        response = await client.post(
            f"{API_BASE_URL}/practitioners/me/availability/schedules",
            headers=headers,
            json=default_schedule
        )
        
        if response.status_code == 201:
            schedule = response.json()
            print(f"✓ Created: {schedule['name']}")
            print(f"  ID: {schedule['id']}")
            print(f"  Timezone: {schedule['timezone']}")
            print(f"  Time slots: {len(schedule['time_slots'])}")
            for slot in schedule['time_slots']:
                days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                print(f"    - {days[slot['day']]}: {slot['start_time']} - {slot['end_time']}")
        else:
            print(f"✗ Failed to create default schedule: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # 2. Create Weekend Schedule
        print("\n2. CREATE WEEKEND SCHEDULE")
        print("-" * 50)
        
        weekend_schedule = {
            "name": "Weekend Hours",
            "description": "Limited weekend availability",
            "timezone": "America/Los_Angeles",
            "is_default": False,
            "is_active": True,
            "time_slots": [
                # Saturday
                {"day": 5, "start_time": "10:00:00", "end_time": "14:00:00"},
                # Sunday
                {"day": 6, "start_time": "10:00:00", "end_time": "14:00:00"},
            ]
        }
        
        response = await client.post(
            f"{API_BASE_URL}/practitioners/me/availability/schedules",
            headers=headers,
            json=weekend_schedule
        )
        
        if response.status_code == 201:
            schedule = response.json()
            print(f"✓ Created: {schedule['name']}")
            print(f"  Time slots: {len(schedule['time_slots'])}")
        else:
            print(f"✗ Failed to create weekend schedule: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # 3. Create Split Shift Schedule
        print("\n3. CREATE SPLIT SHIFT SCHEDULE")
        print("-" * 50)
        
        split_schedule = {
            "name": "Split Shift",
            "description": "Morning and evening availability",
            "timezone": "America/Los_Angeles",
            "is_default": False,
            "is_active": True,
            "time_slots": [
                # Monday morning
                {"day": 0, "start_time": "07:00:00", "end_time": "11:00:00"},
                # Monday evening
                {"day": 0, "start_time": "17:00:00", "end_time": "21:00:00"},
                # Wednesday morning
                {"day": 2, "start_time": "07:00:00", "end_time": "11:00:00"},
                # Wednesday evening
                {"day": 2, "start_time": "17:00:00", "end_time": "21:00:00"},
                # Friday morning
                {"day": 4, "start_time": "07:00:00", "end_time": "11:00:00"},
                # Friday evening
                {"day": 4, "start_time": "17:00:00", "end_time": "21:00:00"},
            ]
        }
        
        response = await client.post(
            f"{API_BASE_URL}/practitioners/me/availability/schedules",
            headers=headers,
            json=split_schedule
        )
        
        if response.status_code == 201:
            schedule = response.json()
            print(f"✓ Created: {schedule['name']}")
            print(f"  Time slots: {len(schedule['time_slots'])}")
        else:
            print(f"✗ Failed to create split schedule: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # 4. Check Availability
        print("\n4. CHECK AVAILABILITY")
        print("-" * 50)
        
        from datetime import date, timedelta
        start_date = date.today()
        end_date = start_date + timedelta(days=7)
        
        response = await client.get(
            f"{API_BASE_URL}/practitioners/me/availability",
            headers=headers,
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "timezone": "America/Los_Angeles"
            }
        )
        
        availability = None
        if response.status_code == 200:
            availability = response.json()
            print(f"✓ Availability retrieved")
            print(f"  Practitioner ID: {availability['practitioner_id']}")
            print(f"  Timezone: {availability['timezone']}")
            print(f"  Schedules: {len(availability.get('schedules', []))}")
            
            for schedule in availability.get('schedules', [])[:3]:
                print(f"\n  Schedule: {schedule['name']}")
                print(f"    Active: {schedule['is_active']}")
                print(f"    Default: {schedule['is_default']}")
                print(f"    Slots: {len(schedule.get('time_slots', []))}")
        else:
            print(f"✗ Failed to get availability: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # 5. Test Schedule Update
        print("\n5. UPDATE SCHEDULE")
        print("-" * 50)
        
        # Get first schedule ID from availability response
        if availability and availability.get('schedules'):
            schedule_id = availability['schedules'][0]['id']
            
            update_data = {
                "name": "Updated Regular Hours",
                "description": "Updated working hours with lunch break"
            }
            
            response = await client.patch(
                f"{API_BASE_URL}/practitioners/me/availability/schedules/{schedule_id}",
                headers=headers,
                json=update_data
            )
            
            if response.status_code == 200:
                print(f"✓ Schedule updated successfully")
            else:
                print(f"✗ Failed to update schedule: {response.status_code}")
                print(f"  Error: {response.text[:200]}")
        
        print("\n" + "="*70)
        print("TEST COMPLETED")
        print("="*70)

if __name__ == "__main__":
    asyncio.run(test_schedule_creation())