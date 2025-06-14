"""
Example client for Django REST Framework authentication API
"""
import requests
import json


class EstuaryAuthClient:
    """Example client for interacting with the auth API"""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None
    
    def register(self, email, password, first_name, last_name, phone_number=None):
        """Register a new user"""
        url = f"{self.base_url}/api/v1/drf/auth/register/"
        data = {
            "email": email,
            "password": password,
            "password_confirm": password,
            "first_name": first_name,
            "last_name": last_name,
        }
        if phone_number:
            data["phone_number"] = phone_number
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 201:
            data = response.json()
            self.access_token = data['access_token']
            self.refresh_token = data['refresh_token']
            self._set_auth_header()
            return data
        else:
            raise Exception(f"Registration failed: {response.text}")
    
    def login(self, email, password):
        """Login with email and password"""
        url = f"{self.base_url}/api/v1/drf/auth/login/"
        data = {
            "email": email,
            "password": password
        }
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            self.refresh_token = data['refresh_token']
            self._set_auth_header()
            return data
        else:
            raise Exception(f"Login failed: {response.text}")
    
    def logout(self):
        """Logout current user"""
        url = f"{self.base_url}/api/v1/drf/auth/logout/"
        data = {}
        if self.refresh_token:
            data["refresh_token"] = self.refresh_token
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            self.access_token = None
            self.refresh_token = None
            self._clear_auth_header()
            return response.json()
        else:
            raise Exception(f"Logout failed: {response.text}")
    
    def refresh_access_token(self):
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise Exception("No refresh token available")
        
        url = f"{self.base_url}/api/v1/drf/auth/token/refresh/"
        data = {"refresh": self.refresh_token}
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access']
            # Note: refresh token might be rotated
            if 'refresh' in data:
                self.refresh_token = data['refresh']
            self._set_auth_header()
            return data
        else:
            raise Exception(f"Token refresh failed: {response.text}")
    
    def get_current_user(self):
        """Get current user profile"""
        url = f"{self.base_url}/api/v1/drf/auth/me/"
        response = self.session.get(url)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 401:
            # Try to refresh token
            try:
                self.refresh_access_token()
                response = self.session.get(url)
                if response.status_code == 200:
                    return response.json()
            except:
                pass
            raise Exception("Authentication failed - please login again")
        else:
            raise Exception(f"Failed to get user profile: {response.text}")
    
    def update_profile(self, **kwargs):
        """Update user profile"""
        url = f"{self.base_url}/api/v1/drf/auth/me/"
        response = self.session.patch(url, json=kwargs)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to update profile: {response.text}")
    
    def change_password(self, current_password, new_password):
        """Change user password"""
        url = f"{self.base_url}/api/v1/drf/auth/change-password/"
        data = {
            "current_password": current_password,
            "new_password": new_password,
            "new_password_confirm": new_password
        }
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to change password: {response.text}")
    
    def _set_auth_header(self):
        """Set authorization header"""
        if self.access_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.access_token}'
            })
    
    def _clear_auth_header(self):
        """Clear authorization header"""
        if 'Authorization' in self.session.headers:
            del self.session.headers['Authorization']


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = EstuaryAuthClient()
    
    try:
        # Register new user
        print("Registering new user...")
        registration_data = client.register(
            email="john.doe@example.com",
            password="securepass123!",
            first_name="John",
            last_name="Doe",
            phone_number="+1234567890"
        )
        print(f"Registration successful: {registration_data['user']['email']}")
        
        # Get current user
        print("Getting user profile...")
        user_profile = client.get_current_user()
        print(f"User: {user_profile['full_name']} ({user_profile['email']})")
        
        # Update profile
        print("Updating profile...")
        updated_profile = client.update_profile(
            first_name="Johnny",
            timezone="America/New_York"
        )
        print(f"Updated name: {updated_profile['first_name']}")
        
        # Change password
        print("Changing password...")
        password_result = client.change_password(
            current_password="securepass123!",
            new_password="newsecurepass456!"
        )
        print(f"Password change: {password_result['message']}")
        
        # Logout
        print("Logging out...")
        logout_result = client.logout()
        print(f"Logout: {logout_result['message']}")
        
        # Login with new password
        print("Logging in with new password...")
        login_data = client.login(
            email="john.doe@example.com",
            password="newsecurepass456!"
        )
        print(f"Login successful: {login_data['user']['email']}")
        
    except Exception as e:
        print(f"Error: {e}")