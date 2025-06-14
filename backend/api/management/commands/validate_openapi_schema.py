"""
Management command to validate OpenAPI schema generation
"""
from django.core.management.base import BaseCommand
from django.urls import reverse
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.validation import validate_schema
import json


class Command(BaseCommand):
    help = 'Validate OpenAPI schema generation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--save',
            action='store_true',
            help='Save the schema to a file',
        )
        parser.add_argument(
            '--output',
            type=str,
            default='openapi-schema.json',
            help='Output file path for the schema',
        )

    def handle(self, *args, **options):
        self.stdout.write('Generating OpenAPI schema...')
        
        try:
            # Generate the schema
            generator = SchemaGenerator()
            schema = generator.get_schema(public=True)
            
            # Validate the schema
            self.stdout.write('Validating schema...')
            errors = validate_schema(schema)
            
            if errors:
                self.stdout.write(self.style.ERROR('Schema validation failed:'))
                for error in errors:
                    self.stdout.write(f'  - {error}')
                return
            
            self.stdout.write(self.style.SUCCESS('Schema validation passed!'))
            
            # Display schema info
            self.stdout.write('\nSchema Information:')
            self.stdout.write(f'  Title: {schema.get("info", {}).get("title")}')
            self.stdout.write(f'  Version: {schema.get("info", {}).get("version")}')
            self.stdout.write(f'  Paths: {len(schema.get("paths", {}))}')
            
            # Count operations by method
            operations = {'get': 0, 'post': 0, 'put': 0, 'patch': 0, 'delete': 0}
            for path, methods in schema.get('paths', {}).items():
                for method in methods:
                    if method in operations:
                        operations[method] += 1
            
            self.stdout.write('\nOperations by Method:')
            for method, count in operations.items():
                self.stdout.write(f'  {method.upper()}: {count}')
            
            # List tags
            tags = schema.get('tags', [])
            self.stdout.write(f'\nTags ({len(tags)}):')
            for tag in tags:
                self.stdout.write(f'  - {tag["name"]}: {tag.get("description", "")}')
            
            # Count schemas
            schemas = schema.get('components', {}).get('schemas', {})
            self.stdout.write(f'\nSchemas: {len(schemas)}')
            
            # Save to file if requested
            if options['save']:
                output_path = options['output']
                with open(output_path, 'w') as f:
                    json.dump(schema, f, indent=2)
                self.stdout.write(
                    self.style.SUCCESS(f'\nSchema saved to: {output_path}')
                )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating schema: {str(e)}')
            )