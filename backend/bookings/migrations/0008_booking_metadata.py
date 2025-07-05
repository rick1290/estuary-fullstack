# Generated manually to add metadata field to Booking model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0007_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='metadata',
            field=models.JSONField(blank=True, default=dict, help_text='Additional data like reminder flags, custom fields, etc.'),
        ),
    ]