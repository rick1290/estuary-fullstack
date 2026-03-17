import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0001_initial'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='JournalEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('public_uuid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('content', models.TextField()),
                ('entry_type', models.CharField(
                    choices=[
                        ('intention', 'Intention'),
                        ('reflection', 'Reflection'),
                        ('note', 'Note'),
                        ('takeaway', 'Takeaway'),
                    ],
                    default='note',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='journal_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('booking', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='journal_entries',
                    to='bookings.booking',
                )),
                ('service_session', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='journal_entries',
                    to='services.servicesession',
                )),
                ('service', models.ForeignKey(
                    blank=True,
                    help_text='The service this entry relates to (for easy filtering)',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='journal_entries',
                    to='services.service',
                )),
            ],
            options={
                'verbose_name': 'Journal Entry',
                'verbose_name_plural': 'Journal Entries',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='journalentry',
            index=models.Index(fields=['user', '-created_at'], name='journal_jou_user_id_abcdef_idx'),
        ),
        migrations.AddIndex(
            model_name='journalentry',
            index=models.Index(fields=['user', 'booking'], name='journal_jou_user_id_booking_idx'),
        ),
        migrations.AddIndex(
            model_name='journalentry',
            index=models.Index(fields=['user', 'service'], name='journal_jou_user_id_service_idx'),
        ),
    ]
