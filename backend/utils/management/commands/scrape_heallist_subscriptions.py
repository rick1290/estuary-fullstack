import csv
import requests
from datetime import datetime
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Scrape subscription data from Heallist.com API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=f'heallist_subscriptions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
            help='Output CSV filename'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=2000,
            help='Number of records to fetch'
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting Heallist subscription data scrape...')
        
        # API endpoint and headers
        url = 'https://api.app.heallist.com'
        headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Host': 'api.app.heallist.com',
            'Origin': 'https://app.heallist.com',
            'Referer': 'https://app.heallist.com/'
        }
        
        # GraphQL query - minimal fields
        query = """
        query HealerUserList($filtersInput: GetHealerUserListFiltersInput, $paginationInput: PaginationInput) {
            getHealerUserList(
                filtersInput: $filtersInput
                paginationInput: $paginationInput
            ) {
                __typename
                items {
                    _id
                    email
                    subscription {
                        nextInvoiceDate
                        nextInvoiceAmount
                        plan
                        isTrial
                        trialPeriod
                    }
                }
                totalCount
            }
        }
        """
        
        # Request payload
        payload = {
            "query": query,
            "variables": {
                "filtersInput": {
                    "sortField": "score",
                    "sortDirection": "DESC"
                },
                "paginationInput": {
                    "limit": options['limit'],
                    "offset": 0
                }
            }
        }
        
        try:
            # Make the request
            self.stdout.write('Fetching subscription data from Heallist API...')
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            if 'errors' in data:
                self.stderr.write(f'API returned errors: {data["errors"]}')
                return
            
            healers = data.get('data', {}).get('getHealerUserList', {}).get('items', [])
            total_count = data.get('data', {}).get('getHealerUserList', {}).get('totalCount', 0)
            
            self.stdout.write(f'Found {len(healers)} healers (Total available: {total_count})')
            
            # Prepare CSV
            output_file = options['output']
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'email',
                    'subscription_plan',
                    'subscription_is_trial',
                    'subscription_trial_period',
                    'next_invoice_date',
                    'next_invoice_amount'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                # Process each healer
                for healer in healers:
                    subscription = healer.get('subscription') or {}
                    
                    row = {
                        'email': healer.get('email'),
                        'subscription_plan': subscription.get('plan', ''),
                        'subscription_is_trial': subscription.get('isTrial', False),
                        'subscription_trial_period': subscription.get('trialPeriod', ''),
                        'next_invoice_date': subscription.get('nextInvoiceDate', ''),
                        'next_invoice_amount': subscription.get('nextInvoiceAmount', 0)
                    }
                    
                    writer.writerow(row)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully saved subscription data to {output_file}'))
            
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Request failed: {e}')
        except Exception as e:
            self.stderr.write(f'Error: {e}')