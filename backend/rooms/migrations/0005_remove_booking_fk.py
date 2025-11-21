# Migration to remove booking FK from Room

from django.db import migrations


class Migration(migrations.Migration):
    """
    Remove booking FK from Room model.
    Access bookings via: room.service_session.bookings.all()
    """

    dependencies = [
        ('rooms', '0004_merge_20250706_0656'),
        ('services', '0023_add_actual_times_remove_room_fk'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='room',
            name='booking',
        ),
    ]
