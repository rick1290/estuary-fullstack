# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0001_initial'),
        ('services', '0009_alter_service_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='schedule',
            field=models.ForeignKey(blank=True, help_text='Availability schedule for session-type services', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='services', to='practitioners.schedule'),
        ),
    ]