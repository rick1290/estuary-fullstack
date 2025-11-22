# Generated migration to populate core service types

from django.db import migrations


def create_service_types(apps, schema_editor):
    """Create core service types if they don't exist."""
    ServiceType = apps.get_model('services', 'ServiceType')

    service_types = [
        {
            'id': 1,
            'name': 'Individual Session',
            'code': 'session',
            'description': 'One-on-one service'
        },
        {
            'id': 2,
            'name': 'Workshop',
            'code': 'workshop',
            'description': 'Group workshop'
        },
        {
            'id': 3,
            'name': 'Course',
            'code': 'course',
            'description': 'Multi-session course'
        },
        {
            'id': 4,
            'name': 'Package',
            'code': 'package',
            'description': 'Service package'
        },
        {
            'id': 5,
            'name': 'Bundle',
            'code': 'bundle',
            'description': 'Service bundle'
        },
        {
            'id': 6,
            'name': 'Retreat',
            'code': 'retreat',
            'description': 'Multi-day retreat experience'
        },
    ]

    for type_data in service_types:
        ServiceType.objects.get_or_create(
            id=type_data['id'],
            defaults={
                'name': type_data['name'],
                'code': type_data['code'],
                'description': type_data['description']
            }
        )


def reverse_migration(apps, schema_editor):
    """No-op reverse - we don't want to delete service types."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0025_status_architecture_refactor'),
    ]

    operations = [
        migrations.RunPython(create_service_types, reverse_migration),
    ]
