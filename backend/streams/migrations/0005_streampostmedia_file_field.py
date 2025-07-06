# Generated migration for StreamPostMedia file field update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streams', '0004_add_stripe_fields'),  # Updated to latest migration
    ]

    operations = [
        # Add new fields
        migrations.AddField(
            model_name='streampostmedia',
            name='file',
            field=models.FileField(
                upload_to='streams/posts/%Y/%m/%d/',
                max_length=500,
                help_text='File stored in CloudFlare R2',
                null=True,  # Temporarily nullable for migration
                blank=True
            ),
        ),
        migrations.AddField(
            model_name='streampostmedia',
            name='content_type',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='streampostmedia',
            name='file_size',
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='streampostmedia',
            name='is_processed',
            field=models.BooleanField(default=True),
        ),
        # Remove old URL fields - commented out for safety
        # You can uncomment these after verifying data migration
        # migrations.RemoveField(
        #     model_name='streampostmedia',
        #     name='media_url',
        # ),
        # migrations.RemoveField(
        #     model_name='streampostmedia',
        #     name='thumbnail_url',
        # ),
    ]