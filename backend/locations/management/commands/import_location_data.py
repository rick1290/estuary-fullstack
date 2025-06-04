import csv
import os
import requests
import zipfile
import io
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.db import transaction
from apps.locations.models import State, City, ZipCode


class Command(BaseCommand):
    help = 'Import location data for states, cities, and zip codes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--states-only',
            action='store_true',
            help='Import only states data',
        )
        parser.add_argument(
            '--cities-only',
            action='store_true',
            help='Import only cities data',
        )
        parser.add_argument(
            '--zips-only',
            action='store_true',
            help='Import only zip codes data',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Directory containing data files',
            default='data/locations',
        )
        parser.add_argument(
            '--download',
            action='store_true',
            help='Download data files if they do not exist',
        )

    def handle(self, *args, **options):
        data_dir = options['data_dir']
        
        # Create data directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)
        
        # Determine which data to import
        import_states = options['states_only'] or not (options['cities_only'] or options['zips_only'])
        import_cities = options['cities_only'] or not (options['states_only'] or options['zips_only'])
        import_zips = options['zips_only'] or not (options['states_only'] or options['cities_only'])
        
        if import_states:
            self.import_states(data_dir, options['download'])
        
        if import_cities:
            self.import_cities(data_dir, options['download'])
        
        if import_zips:
            self.import_zip_codes(data_dir, options['download'])
            
        self.stdout.write(self.style.SUCCESS('Location data import completed successfully'))

    def import_states(self, data_dir, download):
        """Import US states data."""
        states_file = os.path.join(data_dir, 'states.csv')
        
        # Check if file exists, download if needed
        if not os.path.exists(states_file) and download:
            self.stdout.write('Downloading states data...')
            # This is a simple states data file we'll create manually
            states_data = [
                ['Alabama', 'AL'],
                ['Alaska', 'AK'],
                ['Arizona', 'AZ'],
                ['Arkansas', 'AR'],
                ['California', 'CA'],
                ['Colorado', 'CO'],
                ['Connecticut', 'CT'],
                ['Delaware', 'DE'],
                ['Florida', 'FL'],
                ['Georgia', 'GA'],
                ['Hawaii', 'HI'],
                ['Idaho', 'ID'],
                ['Illinois', 'IL'],
                ['Indiana', 'IN'],
                ['Iowa', 'IA'],
                ['Kansas', 'KS'],
                ['Kentucky', 'KY'],
                ['Louisiana', 'LA'],
                ['Maine', 'ME'],
                ['Maryland', 'MD'],
                ['Massachusetts', 'MA'],
                ['Michigan', 'MI'],
                ['Minnesota', 'MN'],
                ['Mississippi', 'MS'],
                ['Missouri', 'MO'],
                ['Montana', 'MT'],
                ['Nebraska', 'NE'],
                ['Nevada', 'NV'],
                ['New Hampshire', 'NH'],
                ['New Jersey', 'NJ'],
                ['New Mexico', 'NM'],
                ['New York', 'NY'],
                ['North Carolina', 'NC'],
                ['North Dakota', 'ND'],
                ['Ohio', 'OH'],
                ['Oklahoma', 'OK'],
                ['Oregon', 'OR'],
                ['Pennsylvania', 'PA'],
                ['Puerto Rico', 'PR'],
                ['Rhode Island', 'RI'],
                ['South Carolina', 'SC'],
                ['South Dakota', 'SD'],
                ['Tennessee', 'TN'],
                ['Texas', 'TX'],
                ['Utah', 'UT'],
                ['Vermont', 'VT'],
                ['Virginia', 'VA'],
                ['Washington', 'WA'],
                ['West Virginia', 'WV'],
                ['Wisconsin', 'WI'],
                ['Wyoming', 'WY'],
                ['District of Columbia', 'DC'],
                ['American Samoa', 'AS'],
                ['Guam', 'GU'],
                ['Northern Mariana Islands', 'MP'],
                ['U.S. Virgin Islands', 'VI']
            ]
            
            os.makedirs(os.path.dirname(states_file), exist_ok=True)
            with open(states_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['name', 'abbreviation'])
                writer.writerows(states_data)
        
        if not os.path.exists(states_file):
            self.stdout.write(self.style.ERROR(f'States file not found at {states_file}'))
            return
        
        self.stdout.write('Importing states...')
        count = 0
        
        with open(states_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                state, created = State.objects.update_or_create(
                    abbreviation=row['abbreviation'],
                    defaults={
                        'name': row['name'],
                        'slug': slugify(row['name'])
                    }
                )
                if created:
                    count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Imported {count} states'))

    def import_cities(self, data_dir, download):
        """Import US cities data."""
        cities_file = os.path.join(data_dir, 'cities.csv')
        
        # Check if file exists, download if needed
        if not os.path.exists(cities_file) and download:
            self.stdout.write('Downloading cities data...')
            # URL for US cities data from SimpleMaps (free version)
            url = 'https://simplemaps.com/static/data/us-cities/1.75/basic/simplemaps_uscities_basicv1.75.zip'
            
            try:
                response = requests.get(url)
                response.raise_for_status()
                
                with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                    csv_file = [f for f in z.namelist() if f.endswith('.csv')][0]
                    z.extract(csv_file, data_dir)
                    os.rename(os.path.join(data_dir, csv_file), cities_file)
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error downloading cities data: {str(e)}'))
                return
        
        if not os.path.exists(cities_file):
            self.stdout.write(self.style.ERROR(f'Cities file not found at {cities_file}'))
            return
        
        self.stdout.write('Importing cities...')
        count = 0
        major_count = 0
        
        # Make sure states are imported first
        if State.objects.count() == 0:
            self.import_states(data_dir, download)
        
        with open(cities_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Process in batches for better performance
            batch_size = 1000
            cities_batch = []
            
            for row in reader:
                try:
                    state = State.objects.get(abbreviation=row['state_id'])
                    
                    # Determine if this is a major city (for SEO purposes)
                    # We'll consider cities with population > 100,000 as major
                    population = int(float(row['population'])) if row['population'] else 0
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
                    
                    if len(cities_batch) >= batch_size:
                        with transaction.atomic():
                            try:
                                City.objects.bulk_create(
                                    cities_batch,
                                    ignore_conflicts=True
                                )
                                count += len(cities_batch)
                                major_count += sum(1 for c in cities_batch if c.is_major)
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f"Error in city bulk create: {str(e)}"))
                        cities_batch = []
                        
                except State.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"State not found: {row['state_id']}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing city {row.get('city', 'unknown')}: {str(e)}"))
            
            # Process any remaining cities
            if cities_batch:
                with transaction.atomic():
                    try:
                        City.objects.bulk_create(
                            cities_batch,
                            ignore_conflicts=True
                        )
                        count += len(cities_batch)
                        major_count += sum(1 for c in cities_batch if c.is_major)
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error in final city bulk create: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f'Imported {count} cities ({major_count} major cities)'))

    def import_zip_codes(self, data_dir, download):
        """Import US zip codes data."""
        zips_file = os.path.join(data_dir, 'zipcodes.csv')
        
        # Check if file exists, download if needed
        if not os.path.exists(zips_file) and download:
            self.stdout.write('Downloading zip codes data...')
            # URL for US zip codes data
            url = 'https://www.unitedstateszipcodes.org/zip-code-database.csv'
            
            try:
                response = requests.get(url)
                response.raise_for_status()
                
                with open(zips_file, 'wb') as f:
                    f.write(response.content)
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error downloading zip codes data: {str(e)}'))
                return
        
        if not os.path.exists(zips_file):
            self.stdout.write(self.style.ERROR(f'Zip codes file not found at {zips_file}'))
            return
        
        self.stdout.write('Importing zip codes...')
        count = 0
        
        # Make sure cities are imported first
        if City.objects.count() == 0:
            self.import_cities(data_dir, download)
        
        with open(zips_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Process in batches for better performance
            batch_size = 1000
            zips_batch = []
            
            for row in reader:
                try:
                    # Skip if no latitude/longitude
                    if not row.get('lat') or not row.get('lng'):
                        continue
                    
                    # Try to find the city
                    city = None
                    try:
                        state = State.objects.get(abbreviation=row['state'])
                        city = City.objects.filter(
                            name__iexact=row['primary_city'],
                            state=state
                        ).first()
                    except (State.DoesNotExist, KeyError):
                        pass
                    
                    zip_data = {
                        'code': row['zip'],
                        'city': city,
                        'latitude': float(row['lat']),
                        'longitude': float(row['lng'])
                    }
                    
                    zips_batch.append(ZipCode(**zip_data))
                    
                    if len(zips_batch) >= batch_size:
                        with transaction.atomic():
                            try:
                                ZipCode.objects.bulk_create(
                                    zips_batch,
                                    ignore_conflicts=True
                                )
                                count += len(zips_batch)
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(f"Error in zip code bulk create: {str(e)}"))
                        zips_batch = []
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing zip code {row.get('zip', 'unknown')}: {str(e)}"))
            
            # Process any remaining zip codes
            if zips_batch:
                with transaction.atomic():
                    try:
                        ZipCode.objects.bulk_create(
                            zips_batch,
                            ignore_conflicts=True
                        )
                        count += len(zips_batch)
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error in final zip code bulk create: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS(f'Imported {count} zip codes'))
