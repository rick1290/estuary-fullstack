# Migration to make slug field required

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0012_populate_service_slugs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='service',
            name='slug',
            field=models.SlugField(max_length=255, unique=True, help_text='URL-friendly version of name'),
        ),
    ]