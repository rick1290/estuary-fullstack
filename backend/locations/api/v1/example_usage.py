"""
Example usage of the Locations API
"""
import requests
import json

# Base URL for the API
BASE_URL = "http://localhost:8000/api/v1/drf/locations"

# Example authentication token (replace with actual token)
headers = {
    "Authorization": "Bearer your-auth-token",
    "Content-Type": "application/json"
}


def example_list_countries():
    """Example: List all active countries"""
    response = requests.get(f"{BASE_URL}/countries/", params={"is_active": True})
    print("Countries:", json.dumps(response.json(), indent=2))


def example_search_cities():
    """Example: Search for cities"""
    response = requests.get(f"{BASE_URL}/cities/", params={
        "search": "San Francisco",
        "is_major": True
    })
    print("Cities:", json.dumps(response.json(), indent=2))


def example_create_location():
    """Example: Create a practitioner location"""
    data = {
        "name": "Wellness Center Downtown",
        "address_line1": "123 Market Street",
        "address_line2": "Suite 456",
        "city": "city-uuid-here",
        "state": "state-uuid-here",
        "postal_code": "94105",
        "country": "country-uuid-here",
        "is_virtual": True,
        "is_in_person": True,
        "service_radius_miles": 5.0
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioner-locations/",
        headers=headers,
        json=data
    )
    print("Created Location:", json.dumps(response.json(), indent=2))


def example_search_nearby_locations():
    """Example: Search for nearby practitioner locations"""
    data = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius": 10.0,
        "location_type": "in_person"
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioner-locations/search/",
        json=data
    )
    print("Nearby Locations:", json.dumps(response.json(), indent=2))


def example_validate_address():
    """Example: Validate and geocode an address"""
    data = {
        "address": "1 Market Street, San Francisco, CA 94105"
    }
    
    response = requests.post(
        f"{BASE_URL}/practitioner-locations/validate_address/",
        headers=headers,
        json=data
    )
    print("Address Validation:", json.dumps(response.json(), indent=2))


def example_update_location():
    """Example: Update a location"""
    location_id = "location-uuid-here"
    data = {
        "name": "Updated Wellness Center",
        "is_primary": True
    }
    
    response = requests.patch(
        f"{BASE_URL}/practitioner-locations/{location_id}/",
        headers=headers,
        json=data
    )
    print("Updated Location:", json.dumps(response.json(), indent=2))


def example_complex_search():
    """Example: Complex location search with multiple filters"""
    # First, search by address to get coordinates
    validate_response = requests.post(
        f"{BASE_URL}/practitioner-locations/validate_address/",
        headers=headers,
        json={"address": "Union Square, San Francisco, CA"}
    )
    
    if validate_response.status_code == 200:
        coords = validate_response.json()
        
        # Then search for nearby locations
        search_data = {
            "latitude": coords["latitude"],
            "longitude": coords["longitude"],
            "radius": 5.0,
            "location_type": "both"
        }
        
        search_response = requests.post(
            f"{BASE_URL}/practitioner-locations/search/",
            json=search_data
        )
        
        results = search_response.json()
        print(f"Found {len(results)} locations within 5 miles")
        
        # Display results sorted by distance
        for location in results[:5]:
            print(f"- {location['practitioner_name']} at {location['full_address']}")
            print(f"  Distance: {location['distance_miles']:.1f} miles")
            print(f"  Types: {', '.join(location['location_types'])}")
            print()


if __name__ == "__main__":
    # Run examples
    print("=== Location API Examples ===\n")
    
    print("1. Listing Countries:")
    example_list_countries()
    
    print("\n2. Searching Cities:")
    example_search_cities()
    
    print("\n3. Validating Address:")
    example_validate_address()
    
    print("\n4. Searching Nearby Locations:")
    example_search_nearby_locations()
    
    print("\n5. Complex Search Example:")
    example_complex_search()