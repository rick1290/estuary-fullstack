from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0026_populate_service_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicesession',
            name='practitioner_notes',
            field=models.TextField(blank=True, help_text='Private notes from practitioner about this session', null=True),
        ),
        migrations.AddField(
            model_name='servicesession',
            name='shared_notes',
            field=models.TextField(blank=True, help_text='Notes shared with all participants', null=True),
        ),
    ]
