from django.core.management.base import BaseCommand
from django.db import transaction
from apps.services.models import Location
from apps.locations.models import City, State
import random


class Command(BaseCommand):
    help = 'Seed test service locations'

    def handle(self, *args, **options):
        self.stdout.write('Seeding service locations...')
        
        # Check if we have cities
        if City.objects.count() == 0:
            self.stdout.write(self.style.ERROR('No cities found. Please run seed_test_locations first.'))
            return
        
        self.seed_service_locations()
        
        self.stdout.write(self.style.SUCCESS('Service locations seeded successfully'))

    def seed_service_locations(self):
        """Seed service locations based on cities."""
        cities = City.objects.all()
        
        # Create some location names for variety
        location_prefixes = [
            "Wellness Center", "Healing Space", "Studio", "Retreat", 
            "Sanctuary", "Spa", "Center", "Clinic", "Office"
        ]
        
        locations_created = 0
        
        # Create 20 service locations
        for i in range(20):
            try:
                # Get a random city
                city = random.choice(list(cities))
                
                # Generate a location name
                prefix = random.choice(location_prefixes)
                name = f"{city.name} {prefix}"
                
                # Generate a street address
                street_number = random.randint(100, 9999)
                street_names = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St", "Wellness Way", "Healing Path"]
                street_name = random.choice(street_names)
                address = f"{street_number} {street_name}"
                
                # Create the location
                location = Location.objects.create(
                    id=i+1,  # Simple sequential ID
                    name=name,
                    address_line1=address,
                    address_line2="" if random.random() < 0.7 else f"Suite {random.randint(100, 999)}",
                    city=city.name,
                    state=city.state.abbreviation,
                    postal_code=f"{random.randint(10000, 99999)}",
                    country="United States",
                    latitude=city.latitude,
                    longitude=city.longitude,
                    is_active=True
                )
                
                locations_created += 1
                
                if locations_created % 5 == 0:
                    self.stdout.write(f'Created {locations_created} service locations so far...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating service location: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'Created {locations_created} service locations'))
