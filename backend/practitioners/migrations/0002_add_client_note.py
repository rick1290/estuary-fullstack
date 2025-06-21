# Generated manually for ClientNote model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('practitioners', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('content', models.TextField(help_text='The note content')),
                ('client', models.ForeignKey(help_text='The client this note is about', on_delete=django.db.models.deletion.CASCADE, related_name='practitioner_notes_about', to=settings.AUTH_USER_MODEL)),
                ('practitioner', models.ForeignKey(help_text='The practitioner who created this note', on_delete=django.db.models.deletion.CASCADE, related_name='client_notes', to='practitioners.practitioner')),
            ],
            options={
                'verbose_name': 'Client Note',
                'verbose_name_plural': 'Client Notes',
                'ordering': ['-created_at'],
                'permissions': [('view_own_client_notes', 'Can view own client notes')],
                'indexes': [
                    models.Index(fields=['practitioner', 'client', '-created_at'], name='practitione_practit_d5a0f5_idx'),
                    models.Index(fields=['practitioner', '-created_at'], name='practitione_practit_4e1c8a_idx'),
                    models.Index(fields=['client'], name='practitione_client__7f8c9a_idx'),
                ],
            },
        ),
    ]