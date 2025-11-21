# Generated migration for ServiceSession refactoring

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0016_remove_servicesession_address_and_more'),
    ]

    operations = [
        # Add session_type field
        migrations.AddField(
            model_name='servicesession',
            name='session_type',
            field=models.CharField(
                choices=[
                    ('individual', 'Individual Session'),
                    ('workshop', 'Workshop'),
                    ('course_session', 'Course Session')
                ],
                default='individual',
                help_text='Type of session - determines visibility and booking behavior',
                max_length=20
            ),
        ),
        # Add visibility field
        migrations.AddField(
            model_name='servicesession',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('public', 'Public'),
                    ('private', 'Private'),
                    ('unlisted', 'Unlisted')
                ],
                default='public',
                help_text='Controls whether session appears in public listings',
                max_length=20
            ),
        ),
        # Remove unique_together constraint
        migrations.AlterUniqueTogether(
            name='servicesession',
            unique_together=set(),
        ),
        # Add indexes for performance
        migrations.AddIndex(
            model_name='servicesession',
            index=models.Index(fields=['service', 'start_time'], name='service_ses_service_idx'),
        ),
        migrations.AddIndex(
            model_name='servicesession',
            index=models.Index(fields=['session_type', 'visibility'], name='service_ses_type_vis_idx'),
        ),
        migrations.AddIndex(
            model_name='servicesession',
            index=models.Index(fields=['visibility', 'start_time'], name='service_ses_vis_time_idx'),
        ),
        migrations.AddIndex(
            model_name='servicesession',
            index=models.Index(fields=['status', 'start_time'], name='service_ses_status_time_idx'),
        ),
    ]
