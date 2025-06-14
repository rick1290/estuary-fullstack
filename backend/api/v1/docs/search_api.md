# Search and Discovery API Documentation

## Overview

The Search and Discovery API provides comprehensive search functionality for the Estuary marketplace, supporting unified search across services, practitioners, and locations with advanced filtering, geospatial search, personalization, and analytics tracking.

## Key Features

- **Unified Search**: Search across multiple entity types (services, practitioners, locations) with a single query
- **Full-Text Search**: PostgreSQL-powered full-text search with fuzzy matching for typos
- **Relevance Scoring**: Multi-factor relevance scoring including text match, location proximity, popularity, and recency
- **Faceted Search**: Dynamic filters that update based on search results
- **Geospatial Search**: Location-based search with distance calculations
- **Personalization**: Personalized results for authenticated users based on search history and preferences
- **Search Analytics**: Comprehensive tracking for search improvement and insights
- **Autocomplete**: Real-time suggestions as users type
- **Trending Discovery**: Identify trending searches, services, and practitioners

## Endpoints

### 1. Unified Search
**POST** `/api/v1/search`

Search across all entity types with comprehensive filtering.

#### Request Body
```json
{
  "query": "yoga therapy",
  "search_type": "all",  // Options: "all", "services", "practitioners", "locations"
  "filters": {
    "price_range": {
      "min": 50,
      "max": 200
    },
    "location_type": ["virtual", "in_person"],
    "distance_miles": 10,
    "min_rating": 4.0,
    "categories": [1, 2, 3],
    "experience_level": ["intermediate", "advanced"]
  },
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "sort_by": "relevance",  // Options: "relevance", "price_low_high", "price_high_low", "rating", "reviews", "distance"
  "page": 1,
  "page_size": 20,
  "fuzzy_match": true,
  "boost_local": true
}
```

#### Response
```json
{
  "success": true,
  "results": [
    {
      "type": "service",
      "data": { /* Service data */ },
      "score": 95.5
    },
    {
      "type": "practitioner",
      "data": { /* Practitioner data */ },
      "score": 88.2
    }
  ],
  "services": [ /* Detailed service results */ ],
  "practitioners": [ /* Detailed practitioner results */ ],
  "locations": [ /* Location results */ ],
  "total_results": 156,
  "page": 1,
  "page_size": 20,
  "total_pages": 8,
  "facets": [
    {
      "name": "Service Type",
      "field": "service_type",
      "type": "terms",
      "values": [
        {
          "value": "session",
          "label": "Individual Session",
          "count": 45,
          "selected": false
        }
      ]
    }
  ],
  "suggestions": [],
  "search_time_ms": 125
}
```

### 2. Autocomplete
**GET** `/api/v1/search/autocomplete`

Get real-time suggestions as users type.

#### Query Parameters
- `query` (required): Partial search query
- `search_type`: Type of suggestions (default: "all")
- `limit`: Maximum suggestions (default: 10, max: 20)
- `include_categories`: Include category suggestions (default: true)

#### Response
```json
{
  "success": true,
  "suggestions": [
    {
      "text": "Yoga Therapy Session",
      "type": "service",
      "subtitle": "by Jane Smith",
      "metadata": {
        "id": "uuid-here",
        "price": 75.00
      }
    },
    {
      "text": "yoga therapy",
      "type": "query",
      "subtitle": "156 searches",
      "metadata": {
        "count": 156
      }
    }
  ],
  "query_time_ms": 15
}
```

### 3. Trending
**GET** `/api/v1/search/trending`

Get trending searches, services, and practitioners.

#### Query Parameters
- `period`: Time period - "day", "week", "month" (default: "week")
- `location`: City slug for local trends
- `limit`: Number of results (default: 10, max: 50)

#### Response
```json
{
  "success": true,
  "trending_searches": [
    {
      "query": "meditation",
      "count": 523
    }
  ],
  "trending_services": [ /* Service results */ ],
  "trending_categories": [
    {
      "type": "category",
      "text": "Mindfulness",
      "count": 89
    }
  ],
  "period": "week",
  "generated_at": "2024-01-20T10:00:00Z"
}
```

### 4. Nearby Search
**POST** `/api/v1/search/nearby`

Geospatial search for services and practitioners near a location.

#### Request Body
```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "radius_miles": 10,
  "search_type": "all",
  "filters": { /* Same as unified search */ },
  "sort_by": "distance",  // Options: "distance", "rating", "popularity"
  "page": 1,
  "page_size": 20
}
```

### 5. Search Suggestions
**GET** `/api/v1/search/suggestions`

Get personalized search suggestions based on user history.

#### Response
```json
{
  "success": true,
  "recent_searches": [
    {
      "query": "yoga therapy",
      "search_type": "services",
      "timestamp": "2024-01-19T15:30:00Z",
      "result_count": 45
    }
  ],
  "recommended_searches": [
    {
      "text": "meditation classes",
      "reason": "similar",
      "subtitle": "Based on your interests"
    }
  ],
  "categories_of_interest": [ /* Categories */ ],
  "similar_services": [ /* Services */ ]
}
```

### 6. Advanced Service Search
**POST** `/api/v1/search/services`

Advanced search specifically for services with additional options.

#### Request Body
```json
{
  "query": "optional text search",
  "filters": {
    /* All standard filters plus: */
    "service_types": ["session", "workshop"],
    "duration_minutes_min": 30,
    "duration_minutes_max": 90,
    "max_participants": 10,
    "has_video": true,
    "offers_packages": true
  },
  "boost_new": true,
  "boost_trending": true,
  "similar_to_service_id": "uuid-here"
}
```

### 7. Advanced Practitioner Search
**POST** `/api/v1/search/practitioners`

Advanced search specifically for practitioners.

#### Request Body
```json
{
  "query": "optional text search",
  "filters": {
    "specializations": [1, 2, 3],
    "modalities": [4, 5, 6],
    "languages": ["en", "es"],
    "years_experience_min": 5,
    "gender": ["female", "non-binary"]
  },
  "match_all_specializations": true,
  "match_all_modalities": false
}
```

### 8. Browse Categories
**GET** `/api/v1/search/categories`

Browse service categories with counts.

#### Query Parameters
- `include_empty`: Include categories with no services (default: false)
- `featured_only`: Only show featured categories (default: false)

#### Response
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Wellness",
      "slug": "wellness",
      "description": "Health and wellness services",
      "icon": "heart",
      "service_count": 156,
      "is_featured": true,
      "subcategories": []
    }
  ],
  "total_categories": 12
}
```

### 9. Dynamic Filters
**GET** `/api/v1/search/filters`

Get available filter options based on current search context.

#### Query Parameters
- `search_type`: Entity type
- `query`: Current search query
- `category_id`: Category context
- `applied_filters`: JSON string of currently applied filters

#### Response
```json
{
  "success": true,
  "filters": [
    {
      "name": "Price",
      "field": "price_range",
      "type": "range",
      "min_value": 25,
      "max_value": 500,
      "step": 10
    },
    {
      "name": "Service Type",
      "field": "service_types",
      "type": "multi_select",
      "options": [
        {
          "value": 1,
          "label": "Individual Session",
          "count": 45,
          "is_selected": false
        }
      ]
    }
  ],
  "applied_filters": {
    "categories": [1, 2]
  },
  "filter_impacts": {
    "service_types": 156  // Results if this filter was removed
  }
}
```

## Search Scoring

The search system uses a multi-factor scoring algorithm:

1. **Text Match Score** (0-100): Based on PostgreSQL full-text search ranking
2. **Location Boost** (0-50): Inversely proportional to distance
3. **Popularity Boost** (0-50): Based on reviews and bookings
4. **Recency Boost** (0-10): For recently added items
5. **Personalization Boost** (0-20): Based on user preferences

Total score = Sum of all factors

## Filter Types

### Price Filters
- `price_range`: Min/max price in dollars
- Supports decimals

### Rating Filters
- `min_rating`: Minimum average rating (0-5)

### Availability Filters
- `availability`: Date/time range for availability
- `available_now`: Boolean for immediate availability

### Location Filters
- `location_type`: Array of "virtual", "in_person", "hybrid"
- `distance_miles`: Maximum distance from search location

### Service Filters
- `service_types`: Array of service type IDs or codes
- `categories`: Array of category IDs
- `duration_minutes_min/max`: Session duration range
- `max_participants`: Maximum group size
- `experience_level`: Array of levels
- `age_appropriate_for`: Age of participant

### Practitioner Filters
- `specializations`: Array of specialization IDs
- `modalities`: Array of modality IDs
- `languages`: Array of language codes
- `gender`: Array of gender preferences
- `years_experience_min`: Minimum years of experience

### Feature Filters
- `is_featured`: Featured items only
- `has_video`: Has promotional video
- `accepts_insurance`: Accepts insurance
- `offers_packages`: Offers package deals
- `offers_discounts`: Has active discounts

## Search Analytics

The system tracks:
- Search queries and filters
- Result counts and click-through rates
- Conversion rates (searches leading to bookings)
- Popular searches by location
- Search refinements and abandonment

## Best Practices

1. **Use Specific Search Types**: When searching for a specific entity type, use the appropriate search_type for better performance

2. **Location-Based Searches**: Always provide location for in-person services to get distance-sorted results

3. **Pagination**: Use reasonable page sizes (20-50) for optimal performance

4. **Caching**: Autocomplete results are cached for 5 minutes

5. **Filter Combinations**: Use the dynamic filters endpoint to understand available options

6. **Error Handling**: Always check the `success` field and handle errors gracefully

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILTERS",
    "message": "Invalid filter combination",
    "details": {
      "field": "price_range",
      "issue": "Maximum price must be greater than minimum price"
    }
  }
}
```

Common error codes:
- `INVALID_QUERY`: Query validation failed
- `INVALID_FILTERS`: Filter validation failed
- `INVALID_LOCATION`: Invalid coordinates
- `SEARCH_FAILED`: Internal search error
- `RATE_LIMITED`: Too many requests