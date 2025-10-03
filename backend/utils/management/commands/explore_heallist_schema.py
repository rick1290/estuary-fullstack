import json
import requests
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Explore Heallist GraphQL schema to discover available fields'

    def handle(self, *args, **options):
        self.stdout.write('Exploring Heallist GraphQL schema...\n')
        
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
        
        # First, try full schema introspection
        introspection_query = """
        {
            __schema {
                types {
                    name
                    kind
                    description
                    fields {
                        name
                        description
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
        }
        """
        
        try:
            self.stdout.write('Attempting full schema introspection...')
            response = requests.post(url, headers=headers, json={"query": introspection_query})
            data = response.json()
            
            if 'errors' in data:
                self.stdout.write(self.style.WARNING('Full introspection failed. Trying specific type query...'))
                
                # Try querying specific HealerUser type
                healer_type_query = """
                {
                    __type(name: "HealerUser") {
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
                
                response = requests.post(url, headers=headers, json={"query": healer_type_query})
                data = response.json()
                
                if 'data' in data and data['data']['__type']:
                    self.stdout.write(self.style.SUCCESS('\nHealerUser fields:'))
                    fields = data['data']['__type']['fields']
                    for field in fields:
                        field_type = field['type']
                        type_name = field_type.get('name') or field_type.get('ofType', {}).get('name', 'Unknown')
                        self.stdout.write(f"  - {field['name']}: {type_name}")
                else:
                    self.stdout.write(self.style.ERROR('Type introspection also failed'))
                    
            else:
                # Parse and display schema
                if 'data' in data and data['data']['__schema']:
                    types = data['data']['__schema']['types']
                    
                    # Find and display HealerUser type
                    for type_def in types:
                        if type_def['name'] == 'HealerUser':
                            self.stdout.write(self.style.SUCCESS(f"\n{type_def['name']} fields:"))
                            if type_def['fields']:
                                for field in type_def['fields']:
                                    field_type = field['type']
                                    type_name = field_type.get('name') or field_type.get('ofType', {}).get('name', 'Unknown')
                                    self.stdout.write(f"  - {field['name']}: {type_name}")
                            break
                    
                    # Also look for related types
                    self.stdout.write('\n\nRelated types found:')
                    for type_def in types:
                        if any(keyword in type_def['name'] for keyword in ['Healer', 'Profile', 'Connect', 'Subscription']):
                            self.stdout.write(f"\n{type_def['name']}:")
                            if type_def.get('fields'):
                                for field in type_def['fields'][:5]:  # Show first 5 fields
                                    field_type = field['type']
                                    type_name = field_type.get('name') or field_type.get('ofType', {}).get('name', 'Unknown')
                                    self.stdout.write(f"  - {field['name']}: {type_name}")
                                if len(type_def['fields']) > 5:
                                    self.stdout.write(f"  ... and {len(type_def['fields']) - 5} more fields")
                
                # Save full schema to file
                with open('heallist_schema.json', 'w') as f:
                    json.dump(data, f, indent=2)
                self.stdout.write(self.style.SUCCESS('\nFull schema saved to heallist_schema.json'))
                    
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Request failed: {e}')
        except Exception as e:
            self.stderr.write(f'Error: {e}')