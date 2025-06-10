# Locations App

## Overview
The locations app manages all geographic entities (countries, states, cities) and practitioner service locations. It supports international locations with SEO-friendly URLs for location-based service discovery.

## Models

### Geographic Hierarchy
```
Country → State/Province → City → Postal Code
```

### Country
- Full geographic entity with ISO codes
- Supports multiple code formats (2-letter, 3-letter, numeric)
- SEO-friendly slugs for URLs like `/locations/united-states/`
- Active flag for enabling/disabling countries

### State (Province/Region)
- Supports any administrative division (states, provinces, territories)
- Linked to Country for international support
- SEO fields for meta tags
- Code field for abbreviations (CA, ON, NSW)

### City
- Full city data with population and coordinates
- Metro area grouping (e.g., "San Francisco Bay Area")
- Service count tracking for popularity
- SEO-friendly URLs like `san-francisco-ca`
- Major city flagging for featured locations

### ZipCode (Postal Code)
- Renamed to be internationally friendly
- Supports any postal code format
- Linked to both City and Country

### PractitionerLocation
- Where practitioners actually provide services
- Can specify service radius for mobile services
- Supports both virtual and in-person services
- Multiple locations per practitioner with primary flag

### Address Model (in utils/models.py)
The `Address` model (formerly Location) is in utils for storing physical addresses:
- Used by any model needing an address
- Not a geographic entity, just street address data
- Has foreign keys to Country for proper addressing

## Key Features

### 1. SEO-Friendly URLs
```python
location.seo_url_path  # Returns: "san-francisco-ca"
```
Use for URLs like: `/services/massage-therapy/san-francisco-ca/`

### 2. International Support
- `state_province` field supports any region type
- `state_province_code` for abbreviations (CA, ON, NSW)
- `country` ForeignKey for proper international support
- Flexible postal codes

### 3. Metro Area Grouping
```python
location.metro_area = "San Francisco Bay Area"
```
Allows searching across related cities (SF, Oakland, San Jose)

### 4. Service Discovery
- `active_service_count` tracks services per location
- Indexes on city, state, postal code for fast searches
- `is_verified` flag for quality control

## Location Strategy

### For US Launch:
1. Use State/City models for major cities
2. Populate metro_area for major regions
3. Focus on SEO pages for high-traffic cities

### For International Expansion:
1. Add Country records as needed
2. Use state_province flexibly (provinces, regions, states)
3. Adjust postal code validation per country

## Best Practices

### 1. Always Use Slugs for URLs
```python
# Good
/services/yoga/new-york-ny/

# Bad  
/services/yoga/New%20York-NY/
```

### 2. Group by Metro Areas
When searching, include metro area:
```python
Location.objects.filter(
    Q(city='San Francisco') | 
    Q(metro_area='San Francisco Bay Area')
)
```

### 3. Track Service Counts
Update `active_service_count` when:
- Services are published/unpublished
- Practitioners activate/deactivate
- Locations are verified/unverified

### 4. Verify Important Locations
Set `is_verified=True` for:
- Practitioner-submitted locations after validation
- High-traffic SEO locations
- Sponsored/featured locations

## SEO Implementation

### Location Pages
Create views for:
- `/services/[category]/[city-state]/` - City service listings
- `/services/[city-state]/` - All services in city
- `/locations/[state]/` - State overview page

### Meta Tags
Use location data for:
- Title: "Massage Therapy in San Francisco, CA | Estuary"
- Description: Include city, state, popular neighborhoods
- Schema.org LocalBusiness markup

## Future Enhancements
- Neighborhood-level data (for dense cities)
- Distance-based search with PostGIS
- Auto-complete location search
- Popular locations algorithm
- Service heat maps