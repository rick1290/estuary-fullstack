# Migration to allow NULL times for draft ServiceSessions
# This enables the new architecture where draft bookings have draft ServiceSessions

from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Allow NULL start_time and end_time for draft ServiceSessions.

    NEW ARCHITECTURE:
    - Package/bundle bookings create draft ServiceSessions with NULL times
    - ServiceSession is updated with actual times when user schedules
    - This makes ServiceSession the single source of truth for ALL bookings
    """

    dependencies = [
        ('services', '0021_create_servicesessions_for_remaining_bookings'),
    ]

    operations = [
        migrations.AlterField(
            model_name='servicesession',
            name='start_time',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text="Start time of the session. NULL for draft/unscheduled sessions."
            ),
        ),
        migrations.AlterField(
            model_name='servicesession',
            name='end_time',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text="End time of the session. NULL for draft/unscheduled sessions."
            ),
        ),
    ]
