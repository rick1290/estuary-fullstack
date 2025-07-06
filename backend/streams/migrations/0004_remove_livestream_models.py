# Generated manually to remove LiveStream models

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('streams', '0003_livestream_livestreamanalytics_livestreamviewer_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='LiveStreamAnalytics',
        ),
        migrations.DeleteModel(
            name='LiveStreamViewer',
        ),
        migrations.DeleteModel(
            name='StreamSchedule',
        ),
        migrations.DeleteModel(
            name='LiveStream',
        ),
    ]