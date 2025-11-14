# Generated migration to remove unused booking fields

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0010_add_order_fk'),
    ]

    operations = [
        # Remove deprecated snapshot fields (now stored on Order.package_metadata)
        migrations.RemoveField(
            model_name='booking',
            name='bundle_name_snapshot',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='bundle_sessions_snapshot',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='package_name_snapshot',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='package_contents_snapshot',
        ),

        # Remove old room FK (replaced by livekit_room)
        migrations.RemoveField(
            model_name='booking',
            name='room',
        ),

        # Remove redundant datetime field (use actual_start_time instead)
        migrations.RemoveField(
            model_name='booking',
            name='started_at',
        ),

        # Remove unused third-party meeting fields
        migrations.RemoveField(
            model_name='booking',
            name='meeting_id',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='meeting_url',
        ),
    ]
