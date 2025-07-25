# Generated by Django 5.1.3 on 2025-06-20 20:24

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0001_initial'),
        ('locations', '0002_initial'),
        ('practitioners', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='practitioner',
            name='slug',
            field=models.SlugField(blank=True, help_text='URL-friendly version of name', max_length=255, null=True, unique=True),
        ),
        migrations.AddIndex(
            model_name='practitioner',
            index=models.Index(fields=['slug'], name='practitione_slug_715d95_idx'),
        ),
    ]
