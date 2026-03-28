from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('practitioners', '0011_add_answer_to_question'),
    ]

    operations = [
        # Make practitioner nullable (was required)
        migrations.AlterField(
            model_name='featurerequest',
            name='practitioner',
            field=models.ForeignKey(
                blank=True,
                help_text='Practitioner who submitted the request (null for regular users)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='feature_requests',
                to='practitioners.practitioner',
            ),
        ),
        # Add user FK
        migrations.AddField(
            model_name='featurerequest',
            name='user',
            field=models.ForeignKey(
                blank=True,
                help_text='User who submitted the request (set for all submissions)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='feedback_requests',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Add feedback_type
        migrations.AddField(
            model_name='featurerequest',
            name='feedback_type',
            field=models.CharField(
                choices=[('bug', 'Bug Report'), ('feature', 'Feature Request'), ('other', 'Other')],
                default='feature',
                help_text='Type of feedback',
                max_length=20,
            ),
        ),
    ]
