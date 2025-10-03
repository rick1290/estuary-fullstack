import csv
import requests
import time
from datetime import datetime
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Analyze Heallist subscription data - fetch small batches to avoid rate limits'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of records per batch'
        )
        parser.add_argument(
            '--max-batches',
            type=int,
            default=5,
            help='Maximum number of batches to fetch'
        )
        parser.add_argument(
            '--delay',
            type=int,
            default=2,
            help='Delay in seconds between batches'
        )

    def handle(self, *args, **options):
        self.stdout.write('Analyzing Heallist subscription data...\n')
        
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
        
        # First, let's try to get subscription type info
        subscription_type_query = """
        {
            __type(name: "HealerSubscription") {
                name
                kind
                fields {
                    name
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
        """
        
        try:
            self.stdout.write('Fetching HealerSubscription type info...')
            response = requests.post(url, headers=headers, json={"query": subscription_type_query})
            data = response.json()
            
            if 'data' in data and data['data']['__type']:
                self.stdout.write(self.style.SUCCESS('\nHealerSubscription fields:'))
                fields = data['data']['__type']['fields']
                for field in fields:
                    field_type = field['type']
                    type_name = field_type.get('name') or field_type.get('ofType', {}).get('name', 'Unknown')
                    self.stdout.write(f"  - {field['name']}: {type_name}")
                    
                # Also check HealerSubscriptionPlan type
                plan_type_query = """
                {
                    __type(name: "HealerSubscriptionPlan") {
                        name
                        kind
                        possibleValues {
                            name
                            description
                        }
                    }
                }
                """
                
                response = requests.post(url, headers=headers, json={"query": plan_type_query})
                data = response.json()
                
                if 'data' in data and data['data']['__type'] and data['data']['__type']['possibleValues']:
                    self.stdout.write(self.style.SUCCESS('\n\nHealerSubscriptionPlan values:'))
                    for value in data['data']['__type']['possibleValues']:
                        self.stdout.write(f"  - {value['name']}")
            
            # Now let's fetch some sample data in small batches
            self.stdout.write('\n\nFetching sample subscription data...')
            
            batch_size = options['batch_size']
            max_batches = options['max_batches']
            delay = options['delay']
            
            all_results = []
            stats = {
                'total': 0,
                'has_trial': 0,
                'paid_users': 0,
                'plans': {},
                'trial_periods': {}
            }
            
            for batch in range(max_batches):
                offset = batch * batch_size
                
                query = """
                query HealerUserList($paginationInput: PaginationInput) {
                    getHealerUserList(
                        filtersInput: {
                            sortField: score,
                            sortDirection: DESC
                        }
                        paginationInput: $paginationInput
                    ) {
                        totalCount
                        items {
                            _id
                            email
                            firstName
                            lastName
                            hasTrial
                            subscription {
                                _id
                                nextInvoiceDate
                                nextInvoiceAmount
                                plan
                                billingCycle
                                isTrial
                                trialPeriod
                            }
                        }
                    }
                }
                """
                
                variables = {
                    "paginationInput": {
                        "limit": batch_size,
                        "offset": offset
                    }
                }
                
                self.stdout.write(f'\nFetching batch {batch + 1}/{max_batches} (offset: {offset})...')
                
                response = requests.post(url, headers=headers, json={"query": query, "variables": variables})
                data = response.json()
                
                if 'errors' in data:
                    self.stdout.write(self.style.WARNING(f'Error in batch {batch + 1}: {data["errors"][0]["message"]}'))
                    break
                
                if 'data' in data and data['data']['getHealerUserList']:
                    items = data['data']['getHealerUserList']['items']
                    total_count = data['data']['getHealerUserList']['totalCount']
                    
                    for item in items:
                        stats['total'] += 1
                        
                        # Check hasTrial field
                        if item.get('hasTrial'):
                            stats['has_trial'] += 1
                        
                        # Analyze subscription data
                        subscription = item.get('subscription')
                        if subscription:
                            # Count paid users (those with subscription data)
                            stats['paid_users'] += 1
                            
                            # Track plans
                            plan = subscription.get('plan', 'Unknown')
                            stats['plans'][plan] = stats['plans'].get(plan, 0) + 1
                            
                            # Track trial info
                            if subscription.get('isTrial'):
                                trial_period = subscription.get('trialPeriod', 'Unknown')
                                stats['trial_periods'][trial_period] = stats['trial_periods'].get(trial_period, 0) + 1
                            
                            # Add to results
                            all_results.append({
                                'email': item.get('email'),
                                'name': f"{item.get('firstName', '')} {item.get('lastName', '')}",
                                'has_trial': item.get('hasTrial'),
                                'subscription_plan': plan,
                                'is_trial': subscription.get('isTrial'),
                                'trial_period': subscription.get('trialPeriod'),
                                'billing_cycle': subscription.get('billingCycle'),
                                'next_invoice_date': subscription.get('nextInvoiceDate'),
                                'next_invoice_amount': subscription.get('nextInvoiceAmount')
                            })
                    
                    self.stdout.write(f'  Fetched {len(items)} items. Total available: {total_count}')
                
                # Delay between batches to avoid rate limits
                if batch < max_batches - 1:
                    time.sleep(delay)
            
            # Display statistics
            self.stdout.write(self.style.SUCCESS('\n\nSUBSCRIPTION STATISTICS:'))
            self.stdout.write(f'Total users analyzed: {stats["total"]}')
            if stats["total"] > 0:
                self.stdout.write(f'Users with hasTrial=true: {stats["has_trial"]} ({stats["has_trial"]/stats["total"]*100:.1f}%)')
                self.stdout.write(f'Users with subscription data: {stats["paid_users"]} ({stats["paid_users"]/stats["total"]*100:.1f}%)')
            else:
                self.stdout.write('No users analyzed - check for errors above')
            
            if stats['plans']:
                self.stdout.write('\nSubscription plans:')
                for plan, count in sorted(stats['plans'].items(), key=lambda x: x[1], reverse=True):
                    self.stdout.write(f'  - {plan}: {count} users')
            
            if stats['trial_periods']:
                self.stdout.write('\nTrial periods:')
                for period, count in sorted(stats['trial_periods'].items(), key=lambda x: x[1], reverse=True):
                    self.stdout.write(f'  - {period}: {count} users')
            
            # Save sample data
            if all_results:
                output_file = f'heallist_subscription_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
                with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                    fieldnames = ['email', 'name', 'has_trial', 'subscription_plan', 'is_trial', 
                                'trial_period', 'billing_cycle', 'next_invoice_date', 'next_invoice_amount']
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(all_results)
                
                self.stdout.write(self.style.SUCCESS(f'\nSample data saved to {output_file}'))
                    
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Request failed: {e}')
        except Exception as e:
            self.stderr.write(f'Error: {e}')