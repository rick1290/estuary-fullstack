# Generated manually - adds 'completed' to Booking status choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0020_status_architecture_refactor'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('pending_payment', 'Pending Payment'),
                    ('confirmed', 'Confirmed'),
                    ('completed', 'Completed'),
                    ('canceled', 'Canceled'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
    ]
