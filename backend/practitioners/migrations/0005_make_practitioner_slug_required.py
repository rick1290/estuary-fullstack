# Migration to make slug field required

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0004_populate_practitioner_slugs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='practitioner',
            name='slug',
            field=models.SlugField(max_length=255, unique=True, help_text='URL-friendly version of name'),
        ),
    ]