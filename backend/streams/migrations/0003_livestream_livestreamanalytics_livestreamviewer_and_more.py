# Generated by Django 5.1.3 on 2025-06-11 00:01

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0002_initial'),
        ('rooms', '0003_initial'),
        ('streams', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='LiveStream',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('public_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, help_text='Public UUID for API exposure', unique=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('live', 'Live'), ('ended', 'Ended'), ('cancelled', 'Cancelled')], default='scheduled', max_length=20)),
                ('tier_level', models.CharField(choices=[('free', 'Free'), ('entry', 'Entry'), ('premium', 'Premium')], default='free', help_text='Minimum tier required to view this live stream', max_length=20)),
                ('is_public', models.BooleanField(default=False, help_text='Whether non-subscribers can view')),
                ('scheduled_start', models.DateTimeField()),
                ('scheduled_end', models.DateTimeField()),
                ('actual_start', models.DateTimeField(blank=True, null=True)),
                ('actual_end', models.DateTimeField(blank=True, null=True)),
                ('allow_chat', models.BooleanField(default=True)),
                ('allow_reactions', models.BooleanField(default=True)),
                ('record_stream', models.BooleanField(default=True)),
                ('current_viewers', models.IntegerField(default=0)),
                ('peak_viewers', models.IntegerField(default=0)),
                ('total_viewers', models.IntegerField(default=0)),
                ('unique_viewers', models.IntegerField(default=0)),
                ('chat_message_count', models.IntegerField(default=0)),
                ('reaction_count', models.IntegerField(default=0)),
                ('thumbnail_url', models.URLField(blank=True, null=True)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('practitioner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_streams', to='practitioners.practitioner')),
                ('room', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='live_stream', to='rooms.room')),
                ('stream', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_streams', to='streams.stream')),
            ],
            options={
                'ordering': ['-scheduled_start'],
            },
        ),
        migrations.CreateModel(
            name='LiveStreamAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('total_viewers', models.IntegerField(default=0)),
                ('unique_viewers', models.IntegerField(default=0)),
                ('peak_concurrent_viewers', models.IntegerField(default=0)),
                ('average_view_duration_seconds', models.IntegerField(default=0)),
                ('total_chat_messages', models.IntegerField(default=0)),
                ('total_reactions', models.IntegerField(default=0)),
                ('unique_chatters', models.IntegerField(default=0)),
                ('free_tier_viewers', models.IntegerField(default=0)),
                ('entry_tier_viewers', models.IntegerField(default=0)),
                ('premium_tier_viewers', models.IntegerField(default=0)),
                ('non_subscriber_viewers', models.IntegerField(default=0)),
                ('viewer_countries', models.JSONField(blank=True, default=dict, help_text='Country code -> viewer count mapping')),
                ('viewer_devices', models.JSONField(blank=True, default=dict, help_text='Device type -> viewer count mapping')),
                ('tips_received_cents', models.IntegerField(default=0)),
                ('computed_at', models.DateTimeField(blank=True, null=True)),
                ('live_stream', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='analytics', to='streams.livestream')),
            ],
        ),
        migrations.CreateModel(
            name='LiveStreamViewer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('left_at', models.DateTimeField(blank=True, null=True)),
                ('duration_seconds', models.IntegerField(default=0)),
                ('chat_messages_sent', models.IntegerField(default=0)),
                ('reactions_sent', models.IntegerField(default=0)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('live_stream', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='viewers', to='streams.livestream')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='live_stream_views', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='StreamSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('recurrence_rule', models.CharField(help_text='RRULE format for recurrence', max_length=500)),
                ('duration_minutes', models.IntegerField(default=60)),
                ('tier_level', models.CharField(choices=[('free', 'Free'), ('entry', 'Entry'), ('premium', 'Premium')], default='free', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('auto_create_days_ahead', models.IntegerField(default=7, help_text='Days ahead to auto-create scheduled streams')),
                ('next_occurrence', models.DateTimeField(blank=True, null=True)),
                ('stream', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='schedules', to='streams.stream')),
            ],
            options={
                'ordering': ['stream', 'title'],
            },
        ),
        migrations.AddIndex(
            model_name='livestream',
            index=models.Index(fields=['stream', 'status'], name='streams_liv_stream__499a43_idx'),
        ),
        migrations.AddIndex(
            model_name='livestream',
            index=models.Index(fields=['practitioner', 'status'], name='streams_liv_practit_401a35_idx'),
        ),
        migrations.AddIndex(
            model_name='livestream',
            index=models.Index(fields=['scheduled_start'], name='streams_liv_schedul_ada0a7_idx'),
        ),
        migrations.AddIndex(
            model_name='livestream',
            index=models.Index(fields=['status', '-scheduled_start'], name='streams_liv_status_436b2a_idx'),
        ),
        migrations.AddIndex(
            model_name='livestreamanalytics',
            index=models.Index(fields=['live_stream'], name='streams_liv_live_st_eb3af2_idx'),
        ),
        migrations.AddIndex(
            model_name='livestreamviewer',
            index=models.Index(fields=['live_stream', 'joined_at'], name='streams_liv_live_st_a827ea_idx'),
        ),
        migrations.AddIndex(
            model_name='livestreamviewer',
            index=models.Index(fields=['user', 'joined_at'], name='streams_liv_user_id_5edf56_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='livestreamviewer',
            unique_together={('live_stream', 'user', 'joined_at')},
        ),
        migrations.AddIndex(
            model_name='streamschedule',
            index=models.Index(fields=['stream', 'is_active'], name='streams_str_stream__bc4b28_idx'),
        ),
        migrations.AddIndex(
            model_name='streamschedule',
            index=models.Index(fields=['next_occurrence'], name='streams_str_next_oc_85aded_idx'),
        ),
    ]
