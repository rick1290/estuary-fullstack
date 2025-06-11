from django.core.management.base import BaseCommand
from django.conf import settings
from locations.models import PractitionerLocation, City, ZipCode
from integrations.google_maps.client import GoogleMapsClient
import time


class Command(BaseCommand):
    help = 'Geocode locations that are missing coordinates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            choices=['practitioner', 'city', 'zipcode'],
            default='practitioner',
            help='Which model to geocode'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum number of items to geocode'
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.1,
            help='Delay between API calls in seconds'
        )

    def handle(self, *args, **options):
        model_type = options['model']
        limit = options['limit']
        delay = options['delay']
        
        if not hasattr(settings, 'GOOGLE_MAPS_API_KEY'):
            self.stdout.write(self.style.ERROR('Google Maps API key not configured'))
            return
        
        client = GoogleMapsClient()
        
        if model_type == 'practitioner':
            self.geocode_practitioner_locations(client, limit, delay)
        elif model_type == 'city':
            self.geocode_cities(client, limit, delay)
        elif model_type == 'zipcode':
            self.geocode_zipcodes(client, limit, delay)
    
    def geocode_practitioner_locations(self, client, limit, delay):
        """Geocode practitioner locations"""
        locations = PractitionerLocation.objects.filter(
            latitude__isnull=True,
            longitude__isnull=True
        )[:limit]
        
        self.stdout.write(f'Found {locations.count()} locations to geocode')
        
        success_count = 0
        error_count = 0
        
        for location in locations:
            try:
                # Build address
                address_parts = [
                    location.address_line1,
                    location.address_line2,
                    f"{location.city.name}, {location.state.code}",
                    location.postal_code,
                    location.country.name
                ]
                address = ', '.join(filter(None, address_parts))
                
                self.stdout.write(f'Geocoding: {address}')
                
                result = client.geocode(address)
                if result:
                    location.latitude = result['lat']
                    location.longitude = result['lng']
                    location.save()
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✓ Geocoded: {address}'))
                else:
                    error_count += 1
                    self.stdout.write(self.style.WARNING(f'✗ No results for: {address}'))
                
                # Delay between requests
                time.sleep(delay)
                
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'✗ Error geocoding {location.id}: {e}'))
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nGeocoding complete: {success_count} succeeded, {error_count} failed'
            )
        )
    
    def geocode_cities(self, client, limit, delay):
        """Geocode cities"""
        cities = City.objects.filter(
            latitude__isnull=True,
            longitude__isnull=True
        )[:limit]
        
        self.stdout.write(f'Found {cities.count()} cities to geocode')
        
        success_count = 0
        error_count = 0
        
        for city in cities:
            try:
                address = f"{city.name}, {city.state.name}, {city.state.country.name}"
                self.stdout.write(f'Geocoding: {address}')
                
                result = client.geocode(address)
                if result:
                    city.latitude = result['lat']
                    city.longitude = result['lng']
                    city.save()
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✓ Geocoded: {address}'))
                else:
                    error_count += 1
                    self.stdout.write(self.style.WARNING(f'✗ No results for: {address}'))
                
                time.sleep(delay)
                
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'✗ Error geocoding {city.id}: {e}'))
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nGeocoding complete: {success_count} succeeded, {error_count} failed'
            )
        )
    
    def geocode_zipcodes(self, client, limit, delay):
        """Geocode zip codes"""
        zipcodes = ZipCode.objects.filter(
            latitude__isnull=True,
            longitude__isnull=True
        )[:limit]
        
        self.stdout.write(f'Found {zipcodes.count()} zip codes to geocode')
        
        success_count = 0
        error_count = 0
        
        for zipcode in zipcodes:
            try:
                # Build components for more precise geocoding
                components = {
                    'postal_code': zipcode.code,
                    'country': zipcode.country.code
                }
                
                self.stdout.write(f'Geocoding: {zipcode.code} ({zipcode.country.code})')
                
                result = client.geocode(components=components)
                if result:
                    zipcode.latitude = result['lat']
                    zipcode.longitude = result['lng']
                    zipcode.save()
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'✓ Geocoded: {zipcode.code}'))
                else:
                    error_count += 1
                    self.stdout.write(self.style.WARNING(f'✗ No results for: {zipcode.code}'))
                
                time.sleep(delay)
                
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'✗ Error geocoding {zipcode.id}: {e}'))
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nGeocoding complete: {success_count} succeeded, {error_count} failed'
            )
        )