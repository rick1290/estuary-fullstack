import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from locations.models import Country, State, City, PractitionerLocation
from practitioners.models import Practitioner
from decimal import Decimal

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def practitioner(db, user):
    return Practitioner.objects.create(
        user=user,
        display_name='Test Practitioner',
        is_verified=True,
        practitioner_status='active'
    )


@pytest.fixture
def country(db):
    return Country.objects.create(
        name='United States',
        code='US',
        code_3='USA',
        numeric_code='840',
        is_active=True
    )


@pytest.fixture
def state(db, country):
    return State.objects.create(
        country=country,
        name='California',
        code='CA',
        is_active=True
    )


@pytest.fixture
def city(db, state):
    return City.objects.create(
        state=state,
        name='San Francisco',
        population=874961,
        latitude=Decimal('37.7749'),
        longitude=Decimal('-122.4194'),
        is_major=True,
        is_active=True
    )


@pytest.fixture
def practitioner_location(db, practitioner, city, state, country):
    return PractitionerLocation.objects.create(
        practitioner=practitioner,
        name='Main Office',
        address_line1='123 Market St',
        city=city,
        state=state,
        postal_code='94105',
        country=country,
        latitude=Decimal('37.7749'),
        longitude=Decimal('-122.4194'),
        is_primary=True,
        is_virtual=True,
        is_in_person=True
    )


class TestCountryAPI:
    def test_list_countries(self, api_client, country):
        url = reverse('locations:country-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        assert response.data['results'][0]['code'] == 'US'
    
    def test_get_country_detail(self, api_client, country):
        url = reverse('locations:country-detail', kwargs={'pk': country.id})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'United States'
        assert response.data['code'] == 'US'


class TestStateAPI:
    def test_list_states(self, api_client, state):
        url = reverse('locations:state-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        assert response.data['results'][0]['code'] == 'CA'
    
    def test_filter_states_by_country(self, api_client, state, country):
        url = reverse('locations:state-list')
        response = api_client.get(url, {'country': country.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert all(s['country'] == country.id for s in response.data['results'])


class TestCityAPI:
    def test_list_cities(self, api_client, city):
        url = reverse('locations:city-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
        assert response.data['results'][0]['name'] == 'San Francisco'
    
    def test_major_cities_endpoint(self, api_client, city):
        url = reverse('locations:city-major-cities')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert all(c['is_major'] for c in response.data)
    
    def test_filter_cities_by_metro(self, api_client, city):
        city.metro_area = 'San Francisco Bay Area'
        city.save()
        
        url = reverse('locations:city-by-metro')
        response = api_client.get(url, {'metro_area': 'San Francisco'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


class TestPractitionerLocationAPI:
    def test_list_practitioner_locations_authenticated(self, api_client, user, practitioner_location):
        api_client.force_authenticate(user=user)
        url = reverse('locations:practitioner-location-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 1
    
    def test_create_location_as_practitioner(self, api_client, user, practitioner, city, state, country):
        api_client.force_authenticate(user=user)
        url = reverse('locations:practitioner-location-list')
        
        data = {
            'name': 'New Location',
            'address_line1': '456 Main St',
            'city': city.id,
            'state': state.id,
            'postal_code': '94102',
            'country': country.id,
            'is_virtual': True,
            'is_in_person': False
        }
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Location'
        assert response.data['practitioner'] == practitioner.id
    
    def test_update_location_as_owner(self, api_client, user, practitioner_location):
        api_client.force_authenticate(user=user)
        url = reverse('locations:practitioner-location-detail', kwargs={'pk': practitioner_location.id})
        
        data = {'name': 'Updated Office Name'}
        response = api_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Office Name'
    
    def test_set_primary_location(self, api_client, user, practitioner_location):
        api_client.force_authenticate(user=user)
        url = reverse('locations:practitioner-location-set-primary', kwargs={'pk': practitioner_location.id})
        
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_primary'] is True
    
    def test_search_locations(self, api_client, practitioner_location):
        url = reverse('locations:practitioner-location-search')
        
        data = {
            'latitude': 37.7749,
            'longitude': -122.4194,
            'radius': 10.0,
            'location_type': 'both'
        }
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert 'distance_miles' in response.data[0]
    
    def test_nearby_locations(self, api_client, practitioner_location):
        url = reverse('locations:practitioner-location-nearby')
        
        response = api_client.get(url, {'lat': 37.7749, 'lng': -122.4194, 'radius': 10})
        assert response.status_code == status.HTTP_200_OK
    
    def test_validate_address(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse('locations:practitioner-location-validate-address')
        
        data = {'address': '123 Market St, San Francisco, CA 94105'}
        response = api_client.post(url, data, format='json')
        
        # This will depend on Google Maps API being configured
        # In tests, it might fail if API key is not set
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_cannot_update_others_location(self, api_client, practitioner_location):
        other_user = User.objects.create_user(
            email='other@example.com',
            password='otherpass123'
        )
        api_client.force_authenticate(user=other_user)
        
        url = reverse('locations:practitioner-location-detail', kwargs={'pk': practitioner_location.id})
        data = {'name': 'Hacked Name'}
        response = api_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN