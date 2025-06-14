# Generated migration for adding response fields to Review model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0003_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='response_text',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='review',
            name='response_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]