# Data migration to populate slug fields for existing practitioners

from django.db import migrations
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    """Generate slugs for existing practitioners"""
    Practitioner = apps.get_model('practitioners', 'Practitioner')
    
    for practitioner in Practitioner.objects.filter(slug__isnull=True):
        # Use display_name if available, otherwise use user's full name
        if practitioner.display_name:
            base_slug = slugify(practitioner.display_name)
        else:
            user = practitioner.user
            full_name = f"{user.first_name} {user.last_name}".strip()
            base_slug = slugify(full_name if full_name else user.email.split('@')[0])
        
        slug = base_slug
        counter = 1
        
        # Ensure uniqueness
        while Practitioner.objects.filter(slug=slug).exclude(pk=practitioner.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        practitioner.slug = slug
        practitioner.save(update_fields=['slug'])


def reverse_slugs(apps, schema_editor):
    """Reverse migration - set slugs to null"""
    Practitioner = apps.get_model('practitioners', 'Practitioner')
    Practitioner.objects.update(slug=None)


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0003_practitioner_slug_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_slugs, reverse_slugs),
    ]