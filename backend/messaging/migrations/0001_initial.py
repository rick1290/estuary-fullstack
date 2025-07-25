# Generated by Django 5.1.3 on 2025-06-10 05:31

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('bookings', '0007_initial'),
        ('services', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Conversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('public_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, help_text='Public UUID for API exposure', unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('is_archived', models.BooleanField(default=False)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('conversation_type', models.CharField(choices=[('direct', 'Direct Message'), ('group', 'Group Conversation'), ('booking', 'Booking Related'), ('service', 'Service Related'), ('support', 'Support')], default='direct', max_length=20)),
                ('related_booking', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='conversations', to='bookings.booking')),
                ('related_service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='conversations', to='services.service')),
            ],
        ),
        migrations.CreateModel(
            name='ConversationParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('role', models.CharField(choices=[('member', 'Member'), ('admin', 'Admin'), ('owner', 'Owner')], default='member', max_length=20)),
                ('is_muted', models.BooleanField(default=False)),
                ('muted_until', models.DateTimeField(blank=True, null=True)),
                ('is_archived', models.BooleanField(default=False)),
                ('archived_at', models.DateTimeField(blank=True, null=True)),
                ('last_read_at', models.DateTimeField(blank=True, null=True)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('left_at', models.DateTimeField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversation_participants', to='messaging.conversation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversation_participations', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='conversation',
            name='participants',
            field=models.ManyToManyField(related_name='conversations', through='messaging.ConversationParticipant', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('public_uuid', models.UUIDField(db_index=True, default=uuid.uuid4, help_text='Public UUID for API exposure', unique=True)),
                ('content', models.TextField()),
                ('message_type', models.CharField(choices=[('text', 'Text'), ('image', 'Image'), ('file', 'File'), ('video', 'Video'), ('audio', 'Audio'), ('system', 'System'), ('link', 'Link'), ('booking_request', 'Booking Request'), ('payment_request', 'Payment Request'), ('interactive', 'Interactive')], default='text', max_length=20)),
                ('attachments', models.JSONField(blank=True, default=list)),
                ('edited_at', models.DateTimeField(blank=True, null=True)),
                ('is_edited', models.BooleanField(default=False)),
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='messaging.conversation')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddField(
            model_name='conversationparticipant',
            name='last_read_message',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='messaging.message'),
        ),
        migrations.CreateModel(
            name='MessageNotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('email_notifications', models.BooleanField(default=True)),
                ('push_notifications', models.BooleanField(default=True)),
                ('sms_notifications', models.BooleanField(default=False)),
                ('notify_new_message', models.BooleanField(default=True)),
                ('notify_new_conversation', models.BooleanField(default=True)),
                ('notify_mentions', models.BooleanField(default=True)),
                ('quiet_hours_enabled', models.BooleanField(default=False)),
                ('quiet_hours_start', models.TimeField(blank=True, null=True)),
                ('quiet_hours_end', models.TimeField(blank=True, null=True)),
                ('quiet_hours_timezone', models.CharField(default='UTC', max_length=50)),
                ('sound_enabled', models.BooleanField(default=True)),
                ('vibration_enabled', models.BooleanField(default=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='message_notification_preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='MessageReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='messaging.message')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='message_receipts', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='TypingIndicator',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_typing', models.BooleanField(default=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='typing_indicators', to='messaging.conversation')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='typing_indicators', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='BlockedUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reason', models.TextField(blank=True)),
                ('blocked', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocked_by_users', to=settings.AUTH_USER_MODEL)),
                ('blocker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocked_users', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'indexes': [models.Index(fields=['blocker'], name='messaging_b_blocker_42f1b4_idx'), models.Index(fields=['blocked'], name='messaging_b_blocked_220396_idx')],
                'unique_together': {('blocker', 'blocked')},
            },
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['is_active', 'updated_at'], name='messaging_c_is_acti_68f9c6_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['related_booking'], name='messaging_c_related_5595b7_idx'),
        ),
        migrations.AddIndex(
            model_name='conversation',
            index=models.Index(fields=['related_service'], name='messaging_c_related_b4ccc9_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['conversation', 'created_at'], name='messaging_m_convers_7bc91b_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['sender', 'created_at'], name='messaging_m_sender__277197_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['is_deleted'], name='messaging_m_is_dele_12264e_idx'),
        ),
        migrations.AddIndex(
            model_name='message',
            index=models.Index(fields=['message_type'], name='messaging_m_message_9677d2_idx'),
        ),
        migrations.AddIndex(
            model_name='conversationparticipant',
            index=models.Index(fields=['user', 'is_active'], name='messaging_c_user_id_ac23f5_idx'),
        ),
        migrations.AddIndex(
            model_name='conversationparticipant',
            index=models.Index(fields=['conversation', 'is_active'], name='messaging_c_convers_e524c6_idx'),
        ),
        migrations.AddIndex(
            model_name='conversationparticipant',
            index=models.Index(fields=['user', 'is_archived'], name='messaging_c_user_id_cac884_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='conversationparticipant',
            unique_together={('conversation', 'user')},
        ),
        migrations.AddIndex(
            model_name='messagereceipt',
            index=models.Index(fields=['user', 'is_read'], name='messaging_m_user_id_ded10d_idx'),
        ),
        migrations.AddIndex(
            model_name='messagereceipt',
            index=models.Index(fields=['message', 'is_read'], name='messaging_m_message_f0f1b8_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='messagereceipt',
            unique_together={('message', 'user')},
        ),
        migrations.AddIndex(
            model_name='typingindicator',
            index=models.Index(fields=['conversation', 'is_typing'], name='messaging_t_convers_f60154_idx'),
        ),
        migrations.AddIndex(
            model_name='typingindicator',
            index=models.Index(fields=['user', 'updated_at'], name='messaging_t_user_id_82a960_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='typingindicator',
            unique_together={('conversation', 'user')},
        ),
    ]
