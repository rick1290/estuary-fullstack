# Migration to add actual times and remove room FK from ServiceSession

from django.db import migrations, models


class Migration(migrations.Migration):
    """
    1. Add actual_start_time/actual_end_time to ServiceSession
    2. Remove room FK (keep livekit_room reverse OneToOne)
    """

    dependencies = [
        ('services', '0022_allow_null_times_for_draft_sessions'),
    ]

    operations = [
        # Add actual times to ServiceSession
        migrations.AddField(
            model_name='servicesession',
            name='actual_start_time',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text="When the session actually started (for billing/analytics)"
            ),
        ),
        migrations.AddField(
            model_name='servicesession',
            name='actual_end_time',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text="When the session actually ended (for billing/analytics)"
            ),
        ),

        # Remove room FK
        migrations.RemoveField(
            model_name='servicesession',
            name='room',
        ),
    ]
