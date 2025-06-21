# Data migration to populate slug fields for existing services

from django.db import migrations
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    """Generate slugs for existing services"""
    Service = apps.get_model('services', 'Service')
    
    for service in Service.objects.filter(slug__isnull=True):
        base_slug = slugify(service.name)
        slug = base_slug
        counter = 1
        
        # Ensure uniqueness
        while Service.objects.filter(slug=slug).exclude(pk=service.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        service.slug = slug
        service.save(update_fields=['slug'])


def reverse_slugs(apps, schema_editor):
    """Reverse migration - set slugs to null"""
    Service = apps.get_model('services', 'Service')
    Service.objects.update(slug=None)


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0011_alter_service_options_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_slugs, reverse_slugs),
    ]