# Remove obsolete media_url and thumbnail_url fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streams', '0005_streampostmedia_file_field'),
    ]

    operations = [
        # Remove old URL fields that are no longer used
        migrations.RemoveField(
            model_name='streampostmedia',
            name='media_url',
        ),
        migrations.RemoveField(
            model_name='streampostmedia',
            name='thumbnail_url',
        ),
        migrations.RemoveField(
            model_name='streampostmedia',
            name='filename',  # This is now a property derived from file field
        ),
        # Make the file field non-nullable since it's now the primary storage method
        migrations.AlterField(
            model_name='streampostmedia',
            name='file',
            field=models.FileField(
                upload_to='streams/posts/%Y/%m/%d/',
                max_length=500,
                help_text='File stored in CloudFlare R2'
            ),
        ),
    ]