# Generated by Django 5.1.3 on 2025-06-10 04:01

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CommunityFollow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Community Follow',
                'verbose_name_plural': 'Community Follows',
            },
        ),
        migrations.CreateModel(
            name='CommunityTopic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=50, unique=True)),
                ('slug', models.SlugField(unique=True)),
                ('description', models.TextField(blank=True)),
                ('is_featured', models.BooleanField(default=False, help_text='Feature this topic in the community highlights')),
                ('post_count', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Topic',
                'verbose_name_plural': 'Topics',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Post',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(blank=True, max_length=255)),
                ('content', models.TextField()),
                ('media_url', models.URLField(blank=True, help_text='URL to image or video')),
                ('media_type', models.CharField(blank=True, choices=[('image', 'Image'), ('video', 'Video'), ('audio', 'Audio')], max_length=20)),
                ('visibility', models.CharField(choices=[('public', 'Public'), ('private', 'Private'), ('followers', 'Followers')], default='public', max_length=20)),
                ('is_pinned', models.BooleanField(default=False, help_text='Pin this post to the top of the feed')),
                ('is_featured', models.BooleanField(default=False, help_text='Feature this post in the community highlights')),
                ('is_archived', models.BooleanField(default=False, help_text='Archive this post (hidden but not deleted)')),
                ('like_count', models.PositiveIntegerField(default=0)),
                ('heart_count', models.PositiveIntegerField(default=0)),
                ('comment_count', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Post',
                'verbose_name_plural': 'Posts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PostComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('content', models.TextField()),
                ('is_hidden', models.BooleanField(default=False, help_text='Hide this comment (e.g., for moderation)')),
            ],
            options={
                'verbose_name': 'Comment',
                'verbose_name_plural': 'Comments',
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='PostPurchaseVisibility',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Post Purchase Visibility',
                'verbose_name_plural': 'Post Purchase Visibilities',
            },
        ),
        migrations.CreateModel(
            name='PostReaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('reaction_type', models.CharField(choices=[('like', 'Like'), ('heart', 'Heart')], max_length=20)),
            ],
            options={
                'verbose_name': 'Reaction',
                'verbose_name_plural': 'Reactions',
            },
        ),
    ]
