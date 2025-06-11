# Django REST Framework Authentication API

This implementation provides a complete authentication system using Django REST Framework that mirrors the functionality of the existing FastAPI authentication endpoints.

## Features

- User registration with email, password, first_name, last_name
- JWT-based authentication (access and refresh tokens)
- User login/logout
- Token refresh
- Current user profile management
- Password change functionality
- Token blacklisting for secure logout
- Response format matching FastAPI endpoints

## Endpoints

All endpoints are available under `/api/v1/drf/auth/`:

### Authentication
- `POST /api/v1/drf/auth/register/` - Register new user
- `POST /api/v1/drf/auth/login/` - User login
- `POST /api/v1/drf/auth/logout/` - Logout (blacklist refresh token)
- `POST /api/v1/drf/auth/token/refresh/` - Refresh access token

### User Management
- `GET /api/v1/drf/auth/me/` - Get current user profile
- `PATCH /api/v1/drf/auth/me/` - Update user profile
- `POST /api/v1/drf/auth/change-password/` - Change password

## Response Format

The API returns responses in the same format as the existing FastAPI endpoints:

### Login/Register Response
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
        "id": 1,
        "uuid": "123e4567-e89b-12d3-a456-426614174000",
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "full_name": "John Doe",
        "display_name": "John Doe",
        "phone_number": "+1234567890",
        "phone_number_verified": false,
        "timezone": "UTC",
        "is_practitioner": false,
        "account_status": "active",
        "last_login": "2024-01-01T12:00:00Z",
        "date_joined": "2024-01-01T10:00:00Z",
        "is_active": true,
        "is_staff": false,
        "is_superuser": false
    }
}
```

### User Profile Response
```json
{
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "display_name": "John Doe",
    "phone_number": "+1234567890",
    "phone_number_verified": false,
    "timezone": "UTC",
    "is_practitioner": false,
    "account_status": "active",
    "last_login": "2024-01-01T12:00:00Z",
    "date_joined": "2024-01-01T10:00:00Z",
    "is_active": true,
    "is_staff": false,
    "is_superuser": false
}
```

## Key Components

### Serializers (`serializers.py`)
- `UserRegistrationSerializer` - Handles user registration with password validation
- `UserLoginSerializer` - Login request validation
- `UserProfileSerializer` - User profile data serialization
- `TokenResponseSerializer` - JWT token response format
- `CustomTokenObtainPairSerializer` - Custom JWT token creation matching FastAPI format
- `PasswordChangeSerializer` - Password change validation
- `MessageResponseSerializer` - Generic message responses

### Views (`views.py`)
- `RegisterView` - User registration endpoint
- `LoginView` - User login with JWT token generation
- `TokenRefreshView` - JWT token refresh
- `LogoutView` - Logout with token blacklisting
- `CurrentUserView` - Get/update current user profile
- `ChangePasswordView` - Password change functionality

### Authentication (`authentication.py`)
- `CustomJWTAuthentication` - Custom JWT authentication class for DRF

### Configuration
- JWT settings configured in `settings.py` using `djangorestframework-simplejwt`
- Access tokens expire in 30 minutes
- Refresh tokens expire in 7 days with rotation
- Token blacklisting enabled for secure logout

## Usage Examples

See `example_client.py` for a complete Python client implementation.

### Basic Registration
```python
import requests

response = requests.post('http://localhost:8000/api/v1/drf/auth/register/', json={
    'email': 'user@example.com',
    'password': 'securepass123!',
    'password_confirm': 'securepass123!',
    'first_name': 'John',
    'last_name': 'Doe'
})

data = response.json()
access_token = data['access_token']
refresh_token = data['refresh_token']
```

### Making Authenticated Requests
```python
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get('http://localhost:8000/api/v1/drf/auth/me/', headers=headers)
user_profile = response.json()
```

## Testing

Run the test suite:
```bash
python manage.py test users.api.v1.tests
```

## Security Features

- Password validation using Django's built-in validators
- JWT token with configurable expiration
- Refresh token rotation
- Token blacklisting for logout
- CORS configuration for frontend integration
- Rate limiting configured
- Secure headers and cookie settings

## Integration with Existing System

This implementation is designed to work alongside the existing FastAPI authentication system:

1. Both systems use the same User model
2. JWT tokens are compatible between systems
3. Response formats match exactly
4. Endpoints are available under different prefixes (`/api/v1/` for FastAPI, `/api/v1/drf/` for DRF)

## Migration Path

To gradually migrate from FastAPI to DRF authentication:

1. Deploy both systems side by side
2. Update frontend to use DRF endpoints (`/api/v1/drf/auth/`)
3. Test thoroughly
4. Remove FastAPI auth endpoints when confident
5. Update frontend to use shorter paths if desired