import csv
import requests
from datetime import datetime
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Scrape practitioner data from heal.me Algolia API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=f'healme_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
            help='Output CSV filename'
        )
        parser.add_argument(
            '--max-pages',
            type=int,
            default=100,
            help='Maximum number of pages to fetch',
            dest='max_pages'
        )
        parser.add_argument(
            '--hits-per-page',
            type=int,
            default=100,
            help='Number of results per page',
            dest='hits_per_page'
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting heal.me data scrape...\n')
        
        # Algolia API configuration
        base_url = 'https://32ofks54g6-dsn.algolia.net/1/indexes/Practice_production/query'
        headers = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://heal.me',
            'referer': 'https://heal.me/',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
        }
        
        params = {
            'x-algolia-agent': 'Algolia for JavaScript (4.20.0); Browser (lite)',
            'x-algolia-api-key': 'fd1cf4b62b9bbdfee6844667cd257ab3',
            'x-algolia-application-id': '32OFKS54G6'
        }
        
        # Base query - we'll modify filters for different searches
        base_payload = {
            "query": "",
            "facets": ["health_issues", "languages", "age_work_withs", "therapies", "location_types"],
            "hitsPerPage": options['hits_per_page'],
            "attributesToHighlight": []
        }
        
        all_practitioners = []
        max_pages = options['max_pages']
        
        try:
            # First, get total count
            base_payload["page"] = 0
            response = requests.post(base_url, params=params, headers=headers, json=base_payload)
            response.raise_for_status()
            data = response.json()
            
            total_hits = data.get('nbHits', 0)
            total_pages = data.get('nbPages', 0)
            
            self.stdout.write(f'Found {total_hits} practitioners across {total_pages} pages')
            
            # Determine how many pages to fetch
            pages_to_fetch = min(max_pages, total_pages)
            
            # Fetch all pages
            for page in range(pages_to_fetch):
                self.stdout.write(f'Fetching page {page + 1}/{pages_to_fetch}...')
                
                base_payload["page"] = page
                response = requests.post(base_url, params=params, headers=headers, json=base_payload)
                response.raise_for_status()
                data = response.json()
                
                hits = data.get('hits', [])
                all_practitioners.extend(hits)
                
                self.stdout.write(f'  Retrieved {len(hits)} practitioners')
            
            self.stdout.write(f'\nTotal practitioners collected: {len(all_practitioners)}')
            
            # Prepare CSV
            output_file = options['output']
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'id',
                    'first_name',
                    'last_name',
                    'email',
                    'practice_name',
                    'title',
                    'city',
                    'state',
                    'country',
                    'zip_code',
                    'phone',
                    'website',
                    'subscription_type',
                    'therapies',
                    'health_issues',
                    'languages',
                    'age_groups',
                    'location_types',
                    'years_in_practice',
                    'profile_url',
                    'has_video',
                    'offers_sliding_scale',
                    'accepts_insurance',
                    'rating',
                    'review_count',
                    'created_at',
                    'updated_at'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                # Process each practitioner
                for practitioner in all_practitioners:
                    # Join array fields
                    therapies = ', '.join(practitioner.get('therapies', []))
                    health_issues = ', '.join(practitioner.get('health_issues', []))
                    languages = ', '.join(practitioner.get('languages', []))
                    age_groups = ', '.join(practitioner.get('age_work_withs', []))
                    location_types = ', '.join(practitioner.get('location_types', []))
                    
                    # Build profile URL
                    slug = practitioner.get('slug', '')
                    profile_url = f"https://heal.me/practitioner/{slug}" if slug else ''
                    
                    row = {
                        'id': practitioner.get('objectID'),
                        'first_name': practitioner.get('first_name'),
                        'last_name': practitioner.get('last_name'),
                        'email': practitioner.get('email'),
                        'practice_name': practitioner.get('practice_name'),
                        'title': practitioner.get('title'),
                        'city': practitioner.get('city'),
                        'state': practitioner.get('state'),
                        'country': practitioner.get('country'),
                        'zip_code': practitioner.get('zip_code'),
                        'phone': practitioner.get('phone'),
                        'website': practitioner.get('website'),
                        'subscription_type': practitioner.get('subscription_type'),
                        'therapies': therapies,
                        'health_issues': health_issues,
                        'languages': languages,
                        'age_groups': age_groups,
                        'location_types': location_types,
                        'years_in_practice': practitioner.get('years_in_practice'),
                        'profile_url': profile_url,
                        'has_video': practitioner.get('has_video', False),
                        'offers_sliding_scale': practitioner.get('offers_sliding_scale', False),
                        'accepts_insurance': practitioner.get('accepts_insurance', False),
                        'rating': practitioner.get('rating'),
                        'review_count': practitioner.get('review_count'),
                        'created_at': practitioner.get('created_at'),
                        'updated_at': practitioner.get('updated_at')
                    }
                    
                    writer.writerow(row)
            
            # Display summary statistics
            self.stdout.write(self.style.SUCCESS(f'\nSuccessfully saved data to {output_file}'))
            
            # Calculate some basic stats
            total_with_email = sum(1 for p in all_practitioners if p.get('email'))
            total_with_phone = sum(1 for p in all_practitioners if p.get('phone'))
            total_with_website = sum(1 for p in all_practitioners if p.get('website'))
            total_virtual = sum(1 for p in all_practitioners if 'virtual' in p.get('location_types', []))
            
            self.stdout.write('\nSUMMARY STATISTICS:')
            self.stdout.write(f'Total practitioners: {len(all_practitioners)}')
            self.stdout.write(f'With email: {total_with_email} ({total_with_email/len(all_practitioners)*100:.1f}%)')
            self.stdout.write(f'With phone: {total_with_phone} ({total_with_phone/len(all_practitioners)*100:.1f}%)')
            self.stdout.write(f'With website: {total_with_website} ({total_with_website/len(all_practitioners)*100:.1f}%)')
            self.stdout.write(f'Virtual practitioners: {total_virtual} ({total_virtual/len(all_practitioners)*100:.1f}%)')
            
            # Subscription types
            subscription_types = {}
            for p in all_practitioners:
                sub_type = p.get('subscription_type', 'Unknown')
                subscription_types[sub_type] = subscription_types.get(sub_type, 0) + 1
            
            self.stdout.write('\nSubscription Types:')
            for sub_type, count in sorted(subscription_types.items(), key=lambda x: x[1], reverse=True):
                self.stdout.write(f'  - {sub_type}: {count} practitioners ({count/len(all_practitioners)*100:.1f}%)')
            
            # Top therapies
            therapy_count = {}
            for p in all_practitioners:
                for therapy in p.get('therapies', []):
                    therapy_count[therapy] = therapy_count.get(therapy, 0) + 1
            
            self.stdout.write('\nTop 10 Therapies:')
            for therapy, count in sorted(therapy_count.items(), key=lambda x: x[1], reverse=True)[:10]:
                self.stdout.write(f'  - {therapy}: {count} practitioners')
                
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Request failed: {e}')
        except Exception as e:
            self.stderr.write(f'Error: {e}')