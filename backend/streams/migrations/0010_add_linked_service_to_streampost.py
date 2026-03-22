from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0001_initial'),
        ('streams', '0009_rename_streams_str_user_id_cd7c8a_idx_streams_str_user_id_6a9934_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='streampost',
            name='linked_service',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional service to embed as a booking card in the post',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='stream_posts',
                to='services.service',
            ),
        ),
    ]
