# Generated manually to update Room model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('rooms', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='created_by',
            field=models.ForeignKey(blank=True, help_text='User who created this room', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_rooms', to='users.user'),
        ),
        migrations.AlterField(
            model_name='room',
            name='name',
            field=models.CharField(db_index=True, max_length=255),
        ),
    ]