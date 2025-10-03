import csv
import requests
from datetime import datetime
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Scrape practitioner data from Heallist.com API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=f'heallist_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
            help='Output CSV filename'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Number of records to fetch'
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting Heallist data scrape...')
        
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
        
        # GraphQL query
        query = """
        query HealerUserList($filtersInput: GetHealerUserListFiltersInput, $paginationInput: PaginationInput) {
            getHealerUserList(
                filtersInput: $filtersInput
                paginationInput: $paginationInput
            ) {
                __typename
                items {
                    ...HealerUserListItem
                }
                totalCount
            }
        }

        fragment HealerUserListItem on HealerUser {
            __typename
            _id
            firstName
            lastName
            email
            isFollowing
            stripeConnect {
                isOnboarded
                totalPayoutsAmount
                isActive
            }
            paypalConnect {
                isOnboarded
                totalPayoutsAmount
                isActive
                accountId
            }
            profile {
                title
                healingTechniques {
                    __typename
                    _id
                    name
                }
                photoUrl
                uniqUrl
                location {
                    name
                    streetAddress
                    suite
                    zip
                    city
                    stateOrProvince
                    country
                }
            }
            payouts(paginationInput: $paginationInput) {
                items {
                    __typename
                    _id
                    amount
                    date
                    provider
                    healerAppointment {
                        _id
                        clientAppointments {
                            healerClientUser {
                                firstName
                                lastName
                            }
                        }
                        healerService {
                            name
                            _id
                            type
                        }
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
            self.stdout.write('Fetching data from Heallist API...')
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
                    'first_name',
                    'last_name',
                    'profile_title',
                    'city',
                    'state',
                    'country',
                    'healing_techniques',
                    'profile_url',
                    'stripe_is_active',
                    'stripe_total_payouts_amount',
                    'paypal_is_active',
                    'paypal_account_id',
                    'paypal_total_payouts_amount',
                    'total_revenue',
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
                    stripe_connect = healer.get('stripeConnect') or {}
                    paypal_connect = healer.get('paypalConnect') or {}
                    profile = healer.get('profile') or {}
                    location = profile.get('location') or {}
                    subscription = healer.get('subscription') or {}
                    
                    # Calculate total revenue
                    stripe_amount = float(stripe_connect.get('totalPayoutsAmount', 0))
                    paypal_amount = float(paypal_connect.get('totalPayoutsAmount', 0))
                    total_revenue = stripe_amount + paypal_amount
                    
                    # Get healing techniques
                    techniques = ', '.join([
                        t.get('name', '') for t in profile.get('healingTechniques', [])
                    ])
                    
                    row = {
                        'email': healer.get('email'),
                        'first_name': healer.get('firstName'),
                        'last_name': healer.get('lastName'),
                        'profile_title': profile.get('title'),
                        'city': location.get('city'),
                        'state': location.get('stateOrProvince'),
                        'country': location.get('country'),
                        'healing_techniques': techniques,
                        'profile_url': f"https://app.heallist.com/healer/{profile.get('uniqUrl')}" if profile.get('uniqUrl') else '',
                        'stripe_is_active': stripe_connect.get('isActive', False),
                        'stripe_total_payouts_amount': stripe_amount,
                        'paypal_is_active': paypal_connect.get('isActive', False),
                        'paypal_account_id': paypal_connect.get('accountId', ''),
                        'paypal_total_payouts_amount': paypal_amount,
                        'total_revenue': total_revenue,
                        'subscription_plan': subscription.get('plan', ''),
                        'subscription_is_trial': subscription.get('isTrial', False),
                        'subscription_trial_period': subscription.get('trialPeriod', ''),
                        'next_invoice_date': subscription.get('nextInvoiceDate', ''),
                        'next_invoice_amount': subscription.get('nextInvoiceAmount', 0)
                    }
                    
                    writer.writerow(row)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully saved data to {output_file}'))
            
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Request failed: {e}')
        except Exception as e:
            self.stderr.write(f'Error: {e}')