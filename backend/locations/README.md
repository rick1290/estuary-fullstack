# Locations App

## Overview
The Locations app provides geolocation-based services for Estuary, enabling:
1. SEO-optimized location pages for states, cities, and zip codes
2. Proximity-based practitioner search
3. Management of practitioner service locations

## Models

### State
Represents US states with name, abbreviation, and slug for SEO-friendly URLs.

### City
Represents cities with population data and geographic coordinates. Major cities (population > 100,000) are flagged for SEO purposes.

### ZipCode
Stores zip codes with their geographic coordinates and city relationships.

### PractitionerLocation
Links practitioners to their service locations, supporting both in-person and virtual services.

## API Endpoints

### Location Search
- `GET /api/v1/search/search-locations/?q=<query>` - Search for locations by text
- `GET /api/v1/search/find-practitioners/?lat=<lat>&lng=<lng>&radius=<miles>` - Find practitioners near coordinates
- `GET /api/v1/search/find-practitioners/?zip_code=<zipcode>&radius=<miles>` - Find practitioners near zip code
- `GET /api/v1/search/find-practitioners/?city_id=<id>&radius=<miles>` - Find practitioners near city
- `GET /api/v1/search/find-practitioners/?state_id=<id>&radius=<miles>` - Find practitioners in state

### Location Data
- `GET /api/v1/states/` - List all states
- `GET /api/v1/states/<slug>/` - Get state details
- `GET /api/v1/cities/` - List all cities (can filter by state and major_only)
- `GET /api/v1/cities/<slug>/` - Get city details
- `GET /api/v1/zip-codes/` - List zip codes (can filter by state and city)
- `GET /api/v1/zip-codes/<code>/` - Get zip code details

### Practitioner Locations
- `GET /api/v1/practitioner-locations/` - List practitioner locations (for authenticated practitioners)
- `POST /api/v1/practitioner-locations/` - Create a new practitioner location
- `PUT/PATCH /api/v1/practitioner-locations/<id>/` - Update a practitioner location
- `DELETE /api/v1/practitioner-locations/<id>/` - Delete a practitioner location

## Data Import

The app includes a management command to import location data:

```bash
# Import all location data (states, cities, zip codes)
python manage.py import_location_data --download

# Import only specific data
python manage.py import_location_data --states-only --download
python manage.py import_location_data --cities-only --download
python manage.py import_location_data --zips-only --download
```

## Next.js Frontend Integration with Google Maps

This app is designed to work with a Next.js frontend using Google Maps API. Here's how the integration works:

### 1. Required Google Maps API Services

- **Maps JavaScript API**: For displaying the interactive map
- **Places API**: For address autocomplete
- **Geocoding API**: For converting addresses to coordinates
- **Distance Matrix API** (optional): For calculating travel times

### 2. Integration Flow

1. **User Initiates a Location Search**:
   - User enters a location (address, city, zip) or uses "near me" feature
   - Or user clicks on a location from a dropdown/autocomplete

2. **Frontend Geocoding with Google Maps API**:
   - Next.js app uses Google Maps Geocoding API to convert the address to coordinates
   - This happens directly on the frontend without querying the backend

3. **Search Request to Django Backend**:
   - Frontend sends these coordinates to the Django backend API
   - Example: `GET /api/v1/search/find-practitioners/?lat=34.052&lng=-118.243&radius=25`

4. **Backend Performs Proximity Search**:
   - Django backend uses these coordinates to find practitioners within the radius
   - It returns practitioners sorted by distance

5. **Display Results on Map**:
   - Frontend displays the results on Google Maps with pins
   - Also shows a list of practitioners sorted by distance

### 3. Next.js Implementation Example

```jsx
import { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const LocationSearch = () => {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // Default: San Francisco
  const [practitioners, setPractitioners] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  
  // Load Google Maps Autocomplete
  useEffect(() => {
    if (window.google && window.google.maps) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        document.getElementById('location-search')
      );
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const newCenter = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          };
          setCenter(newCenter);
          searchNearbyPractitioners(newCenter);
        }
      });
    }
  }, []);
  
  // Search for practitioners near coordinates
  const searchNearbyPractitioners = async (coordinates) => {
    try {
      const response = await fetch(
        `/api/v1/search/find-practitioners/?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=25`
      );
      const data = await response.json();
      setPractitioners(data.practitioners);
    } catch (error) {
      console.error('Error searching for practitioners:', error);
    }
  };
  
  return (
    <div className="location-search-container">
      <div className="search-box">
        <input
          id="location-search"
          type="text"
          placeholder="Enter location (city, zip, address)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button onClick={() => getUserLocation()}>Use My Location</button>
      </div>
      
      <LoadScript
        googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY"
        libraries={['places']}
      >
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '400px' }}
          center={center}
          zoom={12}
          onLoad={map => setMap(map)}
        >
          {/* Marker for center point */}
          <Marker position={center} />
          
          {/* Markers for practitioners */}
          {practitioners.map(practitioner => (
            <Marker
              key={practitioner.id}
              position={{
                lat: parseFloat(practitioner.location.latitude),
                lng: parseFloat(practitioner.location.longitude)
              }}
              title={practitioner.display_name}
            />
          ))}
        </GoogleMap>
      </LoadScript>
      
      <div className="practitioners-list">
        <h2>Practitioners Near This Location</h2>
        {practitioners.map(practitioner => (
          <div key={practitioner.id} className="practitioner-card">
            <h3>{practitioner.display_name}</h3>
            <p>{practitioner.title}</p>
            <p>{practitioner.distance.toFixed(1)} miles away</p>
            <p>{practitioner.location.address_line1}, {practitioner.location.city_name}, {practitioner.location.state_abbreviation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocationSearch;
```

### 4. When to Use Google Maps vs. Backend Database

- **Use Google Maps API directly when**:
  - Converting user input (address, city, zip) to coordinates
  - Displaying the interactive map
  - Providing address autocomplete
  - Getting directions between locations

- **Query the backend database when**:
  - Finding practitioners near coordinates
  - Getting location-specific content for SEO pages
  - Storing and retrieving practitioner locations

### 5. SEO Implementation in Next.js

For SEO-optimized location pages, create dynamic routes in Next.js:

```jsx
// pages/locations/[state]/index.js - State pages
// pages/locations/[state]/[city].js - City pages
// pages/locations/zip/[zipcode].js - Zip code pages
```

Use `getStaticPaths` and `getStaticProps` to pre-generate these pages at build time:

```jsx
// Example for city pages
export async function getStaticPaths() {
  // Get all major cities from the API
  const res = await fetch('https://api.estuary.com/api/v1/cities/?major_only=true');
  const cities = await res.json();
  
  const paths = cities.map(city => ({
    params: { state: city.state.slug, city: city.slug }
  }));
  
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params }) {
  // Get city details and practitioners in this city
  const cityRes = await fetch(`https://api.estuary.com/api/v1/cities/${params.city}/?state=${params.state}`);
  const city = await cityRes.json();
  
  const practitionersRes = await fetch(`https://api.estuary.com/api/v1/search/find-practitioners/?city_id=${city.id}`);
  const practitioners = await practitionersRes.json();
  
  return {
    props: {
      city,
      practitioners: practitioners.practitioners,
    },
    revalidate: 86400, // Regenerate once per day
  };
}
```

## SEO Strategy

The location data powers SEO-optimized pages for:
1. State pages (`/locations/california`)
2. City pages (`/locations/california/los-angeles`)
3. Zip code pages (`/locations/zip/90210`)

These pages include:
- Location-specific titles and meta descriptions
- Lists of practitioners in the area
- Location-specific content about available services
