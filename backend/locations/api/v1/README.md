# Locations API Documentation

## Overview

The Locations API provides endpoints for managing geographic data and practitioner service locations in the Estuary marketplace. It supports physical and virtual locations, geocoding, distance-based queries, and location search functionality.

## Base URL

```
/api/v1/drf/locations/
```

## Authentication

- Most read endpoints are public
- Write operations require authentication and practitioner status
- Location management requires ownership or admin privileges

## Endpoints

### Countries

#### List Countries
```
GET /countries/
```

Query Parameters:
- `is_active` (boolean): Filter by active status
- `search` (string): Search by name or code

#### Get Country Details
```
GET /countries/{id}/
```

### States/Provinces

#### List States
```
GET /states/
```

Query Parameters:
- `country` (UUID): Filter by country ID
- `code` (string): Filter by state code
- `is_active` (boolean): Filter by active status
- `search` (string): Search by name or code

#### Get State Details
```
GET /states/{id}/
```

### Cities

#### List Cities
```
GET /cities/
```

Query Parameters:
- `state` (UUID): Filter by state ID
- `country` (string): Filter by country code
- `metro_area` (string): Filter by metro area
- `is_major` (boolean): Filter major cities
- `is_active` (boolean): Filter by active status
- `min_population` (integer): Minimum population
- `search` (string): Search by name

#### Get Major Cities
```
GET /cities/major_cities/
```

Returns only cities marked as major for SEO/discovery purposes.

#### Get Cities by Metro Area
```
GET /cities/by_metro/?metro_area={metro_area}
```

### Practitioner Locations

#### List Practitioner Locations
```
GET /practitioner-locations/
```

Query Parameters:
- `practitioner` (UUID): Filter by practitioner ID
- `is_primary` (boolean): Filter primary locations
- `is_virtual` (boolean): Filter virtual locations
- `is_in_person` (boolean): Filter in-person locations
- `city` (UUID): Filter by city
- `state` (UUID): Filter by state

#### Create Practitioner Location
```
POST /practitioner-locations/
```

Request Body:
```json
{
    "name": "Downtown Office",
    "address_line1": "123 Main St",
    "address_line2": "Suite 100",
    "city": "uuid",
    "state": "uuid",
    "postal_code": "94105",
    "country": "uuid",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "is_primary": true,
    "is_virtual": true,
    "is_in_person": true,
    "service_radius_miles": 10.0
}
```

#### Update Practitioner Location
```
PATCH /practitioner-locations/{id}/
```

#### Delete Practitioner Location
```
DELETE /practitioner-locations/{id}/
```

#### Set Primary Location
```
POST /practitioner-locations/{id}/set_primary/
```

Sets a location as the primary location for a practitioner.

### Location Search

#### Search Locations
```
POST /practitioner-locations/search/
```

Request Body:
```json
{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "San Francisco, CA",
    "radius": 25.0,
    "location_type": "both",
    "city": "uuid",
    "state": "uuid",
    "postal_code": "94105"
}
```

Response includes locations with calculated distances.

#### Nearby Locations (Simple)
```
GET /practitioner-locations/nearby/?lat={lat}&lng={lng}&radius={radius}
```

#### Validate Address
```
POST /practitioner-locations/validate_address/
```

Request Body:
```json
{
    "address": "123 Main St, San Francisco, CA 94105"
}
```

Response:
```json
{
    "valid": true,
    "formatted_address": "123 Main St, San Francisco, CA 94105, USA",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "components": {
        "street_number": "123",
        "street": "Main Street",
        "city": "San Francisco",
        "state": "CA",
        "postal_code": "94105",
        "country": "US"
    }
}
```

## Data Models

### PractitionerLocation
- Represents a service location for a practitioner
- Can be physical, virtual, or both
- Supports service radius for mobile practitioners
- Automatically geocoded when address is provided

### Location Types
- `in_person`: Physical location where clients visit
- `virtual`: Online/remote services offered
- `both`: Both in-person and virtual services

## Geocoding

The API automatically geocodes addresses when:
- Creating a new location without coordinates
- Updating an address
- Using the validate_address endpoint

Geocoding requires Google Maps API configuration.

## Distance Calculations

Distance calculations use the Haversine formula for great circle distance between two points on Earth. Distances are returned in miles by default.

## Error Handling

Common error responses:
- `400`: Invalid request data
- `401`: Authentication required
- `403`: Permission denied
- `404`: Resource not found
- `500`: Server error (often geocoding failures)

## Best Practices

1. **Always provide coordinates when possible** to avoid geocoding API calls
2. **Use location search for discovery** instead of listing all locations
3. **Cache location data** as it changes infrequently
4. **Batch geocoding operations** using the management command
5. **Set appropriate service radius** for mobile practitioners

## Management Commands

### Geocode Existing Locations
```bash
python manage.py geocode_locations --model=practitioner --limit=100
```

Options:
- `--model`: Type of locations to geocode (practitioner, city, zipcode)
- `--limit`: Maximum number to process
- `--delay`: Delay between API calls (seconds)