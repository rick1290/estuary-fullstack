# Generated manually for adding public_uuid to EarningsTransaction

import uuid
from django.db import migrations, models


def populate_public_uuids(apps, schema_editor):
    """Populate public_uuid for existing EarningsTransaction records."""
    EarningsTransaction = apps.get_model('payments', 'EarningsTransaction')
    for transaction in EarningsTransaction.objects.all():
        if not transaction.public_uuid:
            transaction.public_uuid = uuid.uuid4()
            transaction.save(update_fields=['public_uuid'])


def reverse_populate(apps, schema_editor):
    """Reverse migration - no action needed."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_add_package_metadata'),
    ]

    operations = [
        # Step 1: Add field as nullable WITHOUT default (avoid same UUID for all)
        migrations.AddField(
            model_name='earningstransaction',
            name='public_uuid',
            field=models.UUIDField(null=True, blank=True),
        ),
        # Step 2: Populate existing rows with unique UUIDs
        migrations.RunPython(populate_public_uuids, reverse_populate),
        # Step 3: Make field non-nullable and unique with default for new records
        migrations.AlterField(
            model_name='earningstransaction',
            name='public_uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        # Step 4: Add index for public_uuid lookups
        migrations.AddIndex(
            model_name='earningstransaction',
            index=models.Index(fields=['public_uuid'], name='payments_ea_public__idx'),
        ),
    ]
