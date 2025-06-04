from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site


class Command(BaseCommand):
    help = 'Set up the default Site object for the Django sites framework'

    def handle(self, *args, **options):
        # Check if a site with ID 1 already exists
        try:
            site = Site.objects.get(id=1)
            self.stdout.write(self.style.WARNING(
                f'Site with ID 1 already exists: {site.domain}'
            ))
            
            # Update the existing site
            site.domain = 'localhost:8000'
            site.name = 'Estuary Development'
            site.save()
            
            self.stdout.write(self.style.SUCCESS(
                f'Updated site: {site.domain}'
            ))
            
        except Site.DoesNotExist:
            # Create a new site with ID 1
            site = Site.objects.create(
                id=1,
                domain='localhost:8000',
                name='Estuary Development'
            )
            
            self.stdout.write(self.style.SUCCESS(
                f'Created new site: {site.domain}'
            ))
