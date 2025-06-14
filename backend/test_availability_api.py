"""
Test script for the Availability Management API
"""
import requests
import json
from datetime import datetime, date, time, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8001/api/v1"

# Test user credentials (you'll need to adjust these)
AUTH_TOKEN = "your_jwt_token_here"

# Headers with authentication
headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}


def test_list_schedules():
    """Test listing schedules"""
    print("\n=== Testing List Schedules ===")
    response = requests.get(f"{BASE_URL}/practitioners/availability/schedules", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total schedules: {data.get('total', 0)}")
        for schedule in data.get('schedules', []):
            print(f"- {schedule['name']} (ID: {schedule['id']}, Default: {schedule['is_default']})")
    else:
        print(f"Error: {response.text}")


def test_create_schedule():
    """Test creating a new schedule"""
    print("\n=== Testing Create Schedule ===")
    
    schedule_data = {
        "name": "Summer Schedule 2024",
        "description": "Extended hours for summer season",
        "timezone": "America/New_York",
        "is_default": False,
        "is_active": True,
        "time_slots": [
            {
                "day": 0,  # Monday
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "is_active": True
            },
            {
                "day": 1,  # Tuesday
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "is_active": True
            },
            {
                "day": 2,  # Wednesday
                "start_time": "09:00:00",
                "end_time": "17:00:00",
                "is_active": True
            },
            {
                "day": 3,  # Thursday
                "start_time": "09:00:00",
                "end_time": "19:00:00",
                "is_active": True
            },
            {
                "day": 4,  # Friday
                "start_time": "09:00:00",
                "end_time": "15:00:00",
                "is_active": True
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioners/availability/schedules",
        headers=headers,
        json=schedule_data
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"Created schedule: {data['name']} (ID: {data['id']})")
        print(f"Time slots: {len(data['time_slots'])}")
        return data['id']
    else:
        print(f"Error: {response.text}")
        return None


def test_get_available_slots(service_id):
    """Test getting available time slots"""
    print("\n=== Testing Get Available Slots ===")
    
    params = {
        "service_id": service_id,
        "days_ahead": 14,
        "timezone": "America/New_York",
        "group_by_date": True
    }
    
    response = requests.get(
        f"{BASE_URL}/practitioners/availability/slots",
        headers=headers,
        params=params
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total dates with availability: {data.get('total_dates', 0)}")
        print(f"Total slots available: {data.get('total_slots', 0)}")
        
        # Show first few dates
        for date_info in data.get('dates', [])[:3]:
            print(f"\n{date_info['date']} ({date_info['day_name']}):")
            for slot in date_info['slots'][:3]:
                print(f"  - {slot['start_time']} to {slot['end_time']}")
            if len(date_info['slots']) > 3:
                print(f"  ... and {len(date_info['slots']) - 3} more slots")
    else:
        print(f"Error: {response.text}")


def test_add_exception():
    """Test adding an availability exception"""
    print("\n=== Testing Add Exception ===")
    
    # Add a vacation period
    exception_data = {
        "exception_type": "vacation",
        "start_date": (date.today() + timedelta(days=30)).isoformat(),
        "end_date": (date.today() + timedelta(days=37)).isoformat(),
        "reason": "Summer vacation - Out of office",
        "is_recurring": False,
        "affects_all_services": True
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioners/availability/exceptions",
        headers=headers,
        json=exception_data
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print(f"Created exception: {data['reason']}")
        print(f"Period: {data['start_date']} to {data['end_date']}")
        return data['id']
    else:
        print(f"Error: {response.text}")
        return None


def test_check_availability(service_id):
    """Test checking specific time availability"""
    print("\n=== Testing Check Availability ===")
    
    # Check tomorrow at 2 PM
    check_time = datetime.now() + timedelta(days=1)
    check_time = check_time.replace(hour=14, minute=0, second=0, microsecond=0)
    
    check_data = {
        "service_id": service_id,
        "start_datetime": check_time.isoformat(),
        "timezone": "America/New_York"
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioners/availability/check",
        headers=headers,
        json=check_data
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Time: {check_time.strftime('%Y-%m-%d %H:%M')}")
        print(f"Available: {data['is_available']}")
        if not data['is_available']:
            print(f"Reason: {data.get('reason', 'Unknown')}")
            if data.get('suggested_times'):
                print("Suggested alternative times:")
                for slot in data['suggested_times'][:3]:
                    print(f"  - {slot['date']} {slot['start_time']}")
    else:
        print(f"Error: {response.text}")


def test_set_working_hours():
    """Test setting default working hours"""
    print("\n=== Testing Set Working Hours ===")
    
    working_hours = {
        "timezone": "America/New_York",
        "monday": {"start": "09:00:00", "end": "17:00:00"},
        "tuesday": {"start": "09:00:00", "end": "17:00:00"},
        "wednesday": {"start": "09:00:00", "end": "17:00:00"},
        "thursday": {"start": "09:00:00", "end": "19:00:00"},
        "friday": {"start": "09:00:00", "end": "15:00:00"},
        "saturday": None,  # Closed
        "sunday": None,    # Closed
        "buffer_time_minutes": 15,
        "advance_booking_hours": 24,
        "advance_booking_days": 30
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioners/availability/working-hours",
        headers=headers,
        json=working_hours
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print("Working hours set successfully!")
        print(f"Timezone: {data['timezone']}")
        print(f"Buffer time: {data['buffer_time_minutes']} minutes")
        print(f"Advance booking: {data['advance_booking_hours']} hours to {data['advance_booking_days']} days")
    else:
        print(f"Error: {response.text}")


def test_bulk_schedules():
    """Test bulk schedule operations"""
    print("\n=== Testing Bulk Schedule Create ===")
    
    bulk_data = {
        "schedules": [
            {
                "name": "Weekday Schedule",
                "description": "Standard weekday hours",
                "timezone": "America/New_York",
                "is_default": True,
                "is_active": True,
                "time_slots": [
                    {
                        "day": i,
                        "start_time": "09:00:00",
                        "end_time": "17:00:00",
                        "is_active": True
                    }
                    for i in range(5)  # Monday to Friday
                ]
            },
            {
                "name": "Weekend Schedule",
                "description": "Weekend availability",
                "timezone": "America/New_York",
                "is_default": False,
                "is_active": True,
                "time_slots": [
                    {
                        "day": 5,  # Saturday
                        "start_time": "10:00:00",
                        "end_time": "14:00:00",
                        "is_active": True
                    }
                ]
            }
        ],
        "replace_existing": False
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioners/availability/schedules/bulk",
        headers=headers,
        json=bulk_data
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Created: {len(data.get('created', []))} schedules")
        print(f"Updated: {len(data.get('updated', []))} schedules")
        print(f"Deleted: {len(data.get('deleted', []))} schedules")
        if data.get('errors'):
            print(f"Errors: {len(data['errors'])}")
    else:
        print(f"Error: {response.text}")


def main():
    """Run all tests"""
    print("=== Availability Management API Tests ===")
    print(f"Base URL: {BASE_URL}")
    print("\nNote: You need to set AUTH_TOKEN with a valid JWT token before running these tests.")
    
    # You'll need to provide a valid service ID for testing
    test_service_id = "your-test-service-id"
    
    # Run tests in sequence
    test_list_schedules()
    
    # Create a schedule and use its ID for further tests
    schedule_id = test_create_schedule()
    
    # Test working hours
    test_set_working_hours()
    
    # Test bulk operations
    test_bulk_schedules()
    
    # Test getting available slots
    test_get_available_slots(test_service_id)
    
    # Test adding exceptions
    exception_id = test_add_exception()
    
    # Test availability checking
    test_check_availability(test_service_id)
    
    # List schedules again to see changes
    test_list_schedules()
    
    print("\n=== Tests Complete ===")


if __name__ == "__main__":
    main()