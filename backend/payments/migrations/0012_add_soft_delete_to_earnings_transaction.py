# Generated manually for adding soft delete fields to EarningsTransaction

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0011_add_public_uuid_to_earnings_transaction'),
    ]

    operations = [
        # Add is_deleted field from SoftDeleteModel
        migrations.AddField(
            model_name='earningstransaction',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        # Add deleted_at field from SoftDeleteModel
        migrations.AddField(
            model_name='earningstransaction',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
