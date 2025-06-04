from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.db import transaction
from apps.locations.models import State, City, ZipCode


class Command(BaseCommand):
    help = 'Seed a small batch of test location data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding test location data...')
        
        # First seed states
        self.seed_test_states()
        
        # Then seed cities
        self.seed_test_cities()
        
        self.stdout.write(self.style.SUCCESS('Test location data seeded successfully'))

    def seed_test_states(self):
        """Seed a small set of test states."""
        self.stdout.write('Seeding test states...')
        
        # Just a few states for testing
        states_data = [
            ['California', 'CA'],
            ['New York', 'NY'],
            ['Texas', 'TX'],
            ['Florida', 'FL'],
            ['Illinois', 'IL'],
            ['Pennsylvania', 'PA'],
            ['Puerto Rico', 'PR']  # Including Puerto Rico since it was missing
        ]
        
        count = 0
        for name, abbreviation in states_data:
            state, created = State.objects.update_or_create(
                abbreviation=abbreviation,
                defaults={
                    'name': name,
                    'slug': slugify(name)
                }
            )
            if created:
                count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Imported {count} test states'))

    def seed_test_cities(self):
        """Seed a small set of test cities."""
        self.stdout.write('Seeding test cities...')
        
        # Make sure states exist
        if State.objects.count() == 0:
            self.stdout.write(self.style.ERROR('No states found. Please run seed_test_states first.'))
            return
        
        # Test cities data - major cities for each state we seeded
        cities_data = [
            # California
            {'city': 'Los Angeles', 'state_id': 'CA', 'lat': 34.0522, 'lng': -118.2437, 'population': 3979576},
            {'city': 'San Francisco', 'state_id': 'CA', 'lat': 37.7749, 'lng': -122.4194, 'population': 873965},
            {'city': 'San Diego', 'state_id': 'CA', 'lat': 32.7157, 'lng': -117.1611, 'population': 1425976},
            
            # New York
            {'city': 'New York', 'state_id': 'NY', 'lat': 40.7128, 'lng': -74.0060, 'population': 8336817},
            {'city': 'Buffalo', 'state_id': 'NY', 'lat': 42.8864, 'lng': -78.8784, 'population': 255284},
            
            # Texas
            {'city': 'Houston', 'state_id': 'TX', 'lat': 29.7604, 'lng': -95.3698, 'population': 2320268},
            {'city': 'Austin', 'state_id': 'TX', 'lat': 30.2672, 'lng': -97.7431, 'population': 964254},
            {'city': 'Dallas', 'state_id': 'TX', 'lat': 32.7767, 'lng': -96.7970, 'population': 1345047},
            
            # Florida
            {'city': 'Miami', 'state_id': 'FL', 'lat': 25.7617, 'lng': -80.1918, 'population': 463347},
            {'city': 'Orlando', 'state_id': 'FL', 'lat': 28.5383, 'lng': -81.3792, 'population': 307573},
            
            # Illinois
            {'city': 'Chicago', 'state_id': 'IL', 'lat': 41.8781, 'lng': -87.6298, 'population': 2693976},
            
            # Pennsylvania
            {'city': 'Philadelphia', 'state_id': 'PA', 'lat': 39.9526, 'lng': -75.1652, 'population': 1584064},
            {'city': 'Pittsburgh', 'state_id': 'PA', 'lat': 40.4406, 'lng': -79.9959, 'population': 302407},
            
            # Puerto Rico
            {'city': 'San Juan', 'state_id': 'PR', 'lat': 18.4655, 'lng': -66.1057, 'population': 318441},
            {'city': 'Ponce', 'state_id': 'PR', 'lat': 18.0111, 'lng': -66.6130, 'population': 131881}
        ]
        
        count = 0
        major_count = 0
        cities_batch = []
        
        for row in cities_data:
            try:
                state = State.objects.get(abbreviation=row['state_id'])
                
                # Determine if this is a major city (for SEO purposes)
                population = int(row['population'])
                is_major = population > 100000
                
                city_data = {
                    'name': row['city'],
                    'state': state,
                    'slug': slugify(row['city']),
                    'latitude': float(row['lat']),
                    'longitude': float(row['lng']),
                    'population': population,
                    'is_major': is_major
                }
                
                cities_batch.append(City(**city_data))
                
            except State.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"State not found: {row['state_id']}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing city {row.get('city', 'unknown')}: {str(e)}"))
        
        # Create all cities at once
        if cities_batch:
            with transaction.atomic():
                try:
                    City.objects.bulk_create(
                        cities_batch,
                        ignore_conflicts=True
                    )
                    count = len(cities_batch)
                    major_count = sum(1 for c in cities_batch if c.is_major)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error in city bulk create: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f'Imported {count} test cities ({major_count} major cities)'))
