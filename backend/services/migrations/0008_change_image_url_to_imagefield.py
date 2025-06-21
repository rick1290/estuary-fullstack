# Generated migration file for changing image_url to ImageField

from django.db import migrations, models
import integrations.cloudflare_r2.storage


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0005_alter_service_status'),
    ]

    operations = [
        # First, add the new image field
        migrations.AddField(
            model_name='service',
            name='image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='services/images/%Y/%m/',
                help_text='Service cover image',
                storage=integrations.cloudflare_r2.storage.CloudflareR2Storage(),
            ),
        ),
        # Then remove the old image_url field
        migrations.RemoveField(
            model_name='service',
            name='image_url',
        ),
        # Also remove video_url since videos belong in ServiceResource
        migrations.RemoveField(
            model_name='service',
            name='video_url',
        ),
    ]