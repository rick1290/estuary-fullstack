# Generated by Django 5.1.3 on 2025-06-10 04:01

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('streams', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='streampostcomment',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stream_comments', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='streampostlike',
            name='post',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='likes', to='streams.streampost'),
        ),
        migrations.AddField(
            model_name='streampostlike',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stream_post_likes', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='streampostmedia',
            name='post',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media', to='streams.streampost'),
        ),
        migrations.AddField(
            model_name='streampostview',
            name='post',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='views', to='streams.streampost'),
        ),
        migrations.AddField(
            model_name='streampostview',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='streamsubscription',
            name='stream',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='streams.stream'),
        ),
        migrations.AddField(
            model_name='streamsubscription',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stream_subscriptions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='streamtip',
            name='post',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='tips', to='streams.streampost'),
        ),
        migrations.AddField(
            model_name='streamtip',
            name='stream',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tips', to='streams.stream'),
        ),
        migrations.AddField(
            model_name='streamtip',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stream_tips_sent', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='streamanalytics',
            index=models.Index(fields=['stream', '-date'], name='streams_str_stream__807e1b_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='streamanalytics',
            unique_together={('stream', 'date')},
        ),
        migrations.AddIndex(
            model_name='stream',
            index=models.Index(fields=['is_active', 'is_featured'], name='streams_str_is_acti_bbf625_idx'),
        ),
        migrations.AddIndex(
            model_name='stream',
            index=models.Index(fields=['practitioner'], name='streams_str_practit_30b943_idx'),
        ),
        migrations.AddIndex(
            model_name='streampost',
            index=models.Index(fields=['stream', 'is_published', '-published_at'], name='streams_str_stream__b0afde_idx'),
        ),
        migrations.AddIndex(
            model_name='streampost',
            index=models.Index(fields=['tier_level'], name='streams_str_tier_le_1437d8_idx'),
        ),
        migrations.AddIndex(
            model_name='streampost',
            index=models.Index(fields=['post_type'], name='streams_str_post_ty_e85cc5_idx'),
        ),
        migrations.AddIndex(
            model_name='streampost',
            index=models.Index(fields=['published_at'], name='streams_str_publish_a93db6_idx'),
        ),
        migrations.AddIndex(
            model_name='streampostcomment',
            index=models.Index(fields=['post', 'is_hidden', '-created_at'], name='streams_str_post_id_135747_idx'),
        ),
        migrations.AddIndex(
            model_name='streampostcomment',
            index=models.Index(fields=['parent_comment'], name='streams_str_parent__eb4628_idx'),
        ),
        migrations.AddIndex(
            model_name='streampostlike',
            index=models.Index(fields=['post', 'created_at'], name='streams_str_post_id_41faa8_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='streampostlike',
            unique_together={('post', 'user')},
        ),
        migrations.AddIndex(
            model_name='streampostmedia',
            index=models.Index(fields=['post', 'media_type'], name='streams_str_post_id_d1a0ab_idx'),
        ),
        migrations.AddIndex(
            model_name='streampostview',
            index=models.Index(fields=['post', 'user'], name='streams_str_post_id_0badc3_idx'),
        ),
        migrations.AddIndex(
            model_name='streampostview',
            index=models.Index(fields=['created_at'], name='streams_str_created_a90671_idx'),
        ),
        migrations.AddIndex(
            model_name='streamsubscription',
            index=models.Index(fields=['stream', 'tier', 'status'], name='streams_str_stream__8da3a0_idx'),
        ),
        migrations.AddIndex(
            model_name='streamsubscription',
            index=models.Index(fields=['user', 'status'], name='streams_str_user_id_a09905_idx'),
        ),
        migrations.AddIndex(
            model_name='streamsubscription',
            index=models.Index(fields=['current_period_end'], name='streams_str_current_e098d1_idx'),
        ),
        migrations.AddIndex(
            model_name='streamsubscription',
            index=models.Index(fields=['stripe_subscription_id'], name='streams_str_stripe__01a6b5_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='streamsubscription',
            unique_together={('user', 'stream')},
        ),
        migrations.AddIndex(
            model_name='streamtip',
            index=models.Index(fields=['stream', '-created_at'], name='streams_str_stream__97b460_idx'),
        ),
        migrations.AddIndex(
            model_name='streamtip',
            index=models.Index(fields=['user', '-created_at'], name='streams_str_user_id_07f35e_idx'),
        ),
        migrations.AddIndex(
            model_name='streamtip',
            index=models.Index(fields=['status'], name='streams_str_status_75e30c_idx'),
        ),
    ]
