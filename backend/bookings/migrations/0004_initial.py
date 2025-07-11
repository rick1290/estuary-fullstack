# Generated by Django 5.1.3 on 2025-06-10 04:01

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('bookings', '0003_initial'),
        ('practitioners', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='practitioner',
            field=models.ForeignKey(help_text='Practitioner providing the service', on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='practitioners.practitioner'),
        ),
        migrations.AddField(
            model_name='booking',
            name='rescheduled_from',
            field=models.ForeignKey(blank=True, help_text='Original booking this was rescheduled from', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rescheduled_to_bookings', to='bookings.booking'),
        ),
    ]
