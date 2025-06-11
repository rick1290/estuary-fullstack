"""
Example usage of the Services API

These examples demonstrate how to interact with the Services API endpoints.
"""

# Base URL for the API (adjust based on your environment)
BASE_URL = "http://localhost:8000/api/v1/drf/services"

# Example 1: List all service categories
"""
GET /api/v1/drf/services/categories/

Response:
[
    {
        "id": 1,
        "name": "Wellness",
        "slug": "wellness",
        "description": "Wellness and mindfulness services",
        "icon": "spa",
        "is_active": true,
        "is_featured": true,
        "order": 0,
        "service_count": 15,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
]
"""

# Example 2: Create a new service (as a practitioner)
"""
POST /api/v1/drf/services/services/
Headers: Authorization: Bearer <token>

Request Body:
{
    "name": "60-Minute Meditation Session",
    "description": "Deep relaxation meditation session with guided breathing",
    "short_description": "Relaxing meditation for stress relief",
    "price": 75.00,
    "duration_minutes": 60,
    "service_type_id": 1,
    "category_id": 1,
    "max_participants": 1,
    "min_participants": 1,
    "experience_level": "all_levels",
    "location_type": "virtual",
    "what_youll_learn": "- Breathing techniques\n- Mindfulness practices\n- Stress reduction",
    "includes": ["Guided meditation", "Follow-up resources", "Recording access"],
    "is_active": true,
    "is_public": true,
    "status": "published"
}

Response:
{
    "id": 123,
    "public_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "60-Minute Meditation Session",
    "price": "75.00",
    "price_cents": 7500,
    ...
}
"""

# Example 3: Create a service package
"""
POST /api/v1/drf/services/services/
Headers: Authorization: Bearer <token>

Request Body:
{
    "name": "5-Session Meditation Package",
    "description": "Save 10% with our 5-session package",
    "price": 337.50,
    "service_type_id": 4,  // "package" type
    "category_id": 1,
    "validity_days": 90,
    "is_transferable": false,
    "highlight_text": "SAVE 10%",
    "child_service_configs": [
        {
            "child_service_id": 123,
            "quantity": 5,
            "discount_percentage": 10
        }
    ]
}
"""

# Example 4: Create a bundle
"""
POST /api/v1/drf/services/services/
Headers: Authorization: Bearer <token>

Request Body:
{
    "name": "Wellness Bundle - 10 Sessions",
    "description": "Our best value wellness bundle",
    "price": 600.00,
    "service_type_id": 5,  // "bundle" type
    "category_id": 1,
    "sessions_included": 10,
    "bonus_sessions": 2,
    "validity_days": 180,
    "highlight_text": "BEST VALUE - 2 FREE SESSIONS",
    "max_per_customer": 1
}
"""

# Example 5: Search and filter services
"""
GET /api/v1/drf/services/services/search/?q=meditation&category=wellness&min_price=50&max_price=100&location_type=virtual&sort_by=-rating

Response:
{
    "count": 25,
    "page": 1,
    "page_size": 20,
    "total_pages": 2,
    "results": [
        {
            "id": 123,
            "name": "60-Minute Meditation Session",
            "price": "75.00",
            "average_rating": 4.8,
            "total_reviews": 42,
            ...
        }
    ]
}
"""

# Example 6: Join a waitlist
"""
POST /api/v1/drf/services/services/123/waitlist/
Headers: Authorization: Bearer <token>

Response:
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "service": 123,
    "position": 5,
    "status": "waiting",
    "joined_at": "2024-01-15T10:00:00Z"
}
"""

# Example 7: Upload media for a service
"""
POST /api/v1/media/upload/
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- entity_type: "service"
- entity_id: "123"
- file: <image file>
- title: "Service Cover Image"
- is_primary: true
- display_order: 0
"""

# Example 8: Add a resource to a service
"""
POST /api/v1/drf/services/resources/
Headers: Authorization: Bearer <token>

Request Body:
{
    "title": "Meditation Guide PDF",
    "description": "Comprehensive guide to meditation techniques",
    "resource_type": "document",
    "attachment_level": "service",
    "service": 123,
    "file_url": "https://storage.example.com/resources/meditation-guide.pdf",
    "file_name": "meditation-guide.pdf",
    "file_size": 2048000,
    "file_type": "application/pdf",
    "access_level": "enrolled",
    "is_downloadable": true,
    "order": 0
}
"""

# Example 9: Managing practitioner categories
"""
# Create custom category
POST /api/v1/drf/services/practitioner-categories/
Headers: Authorization: Bearer <token>

Request Body:
{
    "name": "Premium Services",
    "description": "My premium service offerings",
    "color": "#FFD700",
    "icon": "star",
    "order": 0
}

# Reorder categories
POST /api/v1/drf/services/practitioner-categories/reorder/
Headers: Authorization: Bearer <token>

Request Body:
{
    "category_ids": [3, 1, 4, 2]
}
"""

# Example 10: Filtering with multiple parameters
"""
GET /api/v1/drf/services/services/?category=wellness&practitioner=45&min_participants=1&max_participants=10&experience_level=beginner&is_featured=true&available_now=true

# Using django-filter backend
GET /api/v1/drf/services/services/?service_type=workshop&location_type=in_person&min_duration=120&max_duration=240&has_bonus=true
"""

# Python client example
import requests

class ServicesAPIClient:
    def __init__(self, base_url, auth_token=None):
        self.base_url = base_url
        self.headers = {}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'
    
    def list_categories(self):
        """List all service categories"""
        response = requests.get(f"{self.base_url}/categories/")
        return response.json()
    
    def search_services(self, query, filters=None):
        """Search services with filters"""
        params = {'q': query}
        if filters:
            params.update(filters)
        response = requests.get(f"{self.base_url}/services/search/", params=params)
        return response.json()
    
    def create_service(self, service_data):
        """Create a new service"""
        response = requests.post(
            f"{self.base_url}/services/",
            json=service_data,
            headers=self.headers
        )
        return response.json()
    
    def get_service_details(self, service_id):
        """Get detailed information about a service"""
        response = requests.get(f"{self.base_url}/services/{service_id}/")
        return response.json()
    
    def join_waitlist(self, service_id):
        """Join the waitlist for a service"""
        response = requests.post(
            f"{self.base_url}/services/{service_id}/waitlist/",
            headers=self.headers
        )
        return response.json()

# Usage example
if __name__ == "__main__":
    # Initialize client
    client = ServicesAPIClient(BASE_URL, auth_token="your-auth-token")
    
    # Search for meditation services
    results = client.search_services(
        "meditation",
        filters={
            "category": "wellness",
            "min_price": 50,
            "max_price": 100,
            "location_type": "virtual"
        }
    )
    
    print(f"Found {results['count']} meditation services")
    
    # Create a new service
    new_service = client.create_service({
        "name": "Evening Yoga Class",
        "description": "Relaxing evening yoga",
        "price": 60.00,
        "duration_minutes": 75,
        "service_type_id": 1,
        "category_id": 1,
        "max_participants": 8,
        "location_type": "hybrid"
    })
    
    print(f"Created service: {new_service['name']} (ID: {new_service['id']})")