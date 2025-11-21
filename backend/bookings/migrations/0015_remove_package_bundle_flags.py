# Migration to remove is_package_purchase and is_bundle_purchase flags

from django.db import migrations


class Migration(migrations.Migration):
    """
    Remove is_package_purchase and is_bundle_purchase boolean fields.
    Use order.order_type instead to determine if booking is part of package/bundle.
    """

    dependencies = [
        ('bookings', '0014_alter_booking_actual_end_time_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='booking',
            name='is_package_purchase',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='is_bundle_purchase',
        ),
    ]
