"""
Schema migration: Create ModalityCategory model and add new fields to Modality.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0003_populate_modality_slugs'),
    ]

    operations = [
        # 1. Create ModalityCategory table
        migrations.CreateModel(
            name='ModalityCategory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('slug', models.SlugField(blank=True, max_length=100, unique=True)),
                ('short_description', models.TextField(blank=True, default='')),
                ('long_description', models.TextField(blank=True, default='')),
                ('icon', models.CharField(blank=True, max_length=50, null=True)),
                ('color', models.CharField(blank=True, default='', help_text='Hex color code for UI theming', max_length=7)),
                ('order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('seo_meta_title', models.CharField(blank=True, max_length=200, null=True)),
                ('seo_meta_description', models.TextField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Modality Category',
                'verbose_name_plural': 'Modality Categories',
                'ordering': ['order', 'name'],
            },
        ),
        # 2. Add new fields to Modality
        migrations.AddField(
            model_name='modality',
            name='category_ref',
            field=models.ForeignKey(
                blank=True,
                help_text='FK to ModalityCategory',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='modalities',
                to='common.modalitycategory',
            ),
        ),
        migrations.AddField(
            model_name='modality',
            name='cluster',
            field=models.CharField(blank=True, help_text='Sub-group within category', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='short_description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='long_description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='benefits',
            field=models.JSONField(blank=True, default=list, help_text='Array of benefit strings'),
        ),
        migrations.AddField(
            model_name='modality',
            name='faqs',
            field=models.JSONField(blank=True, default=list, help_text='Array of {question, answer} objects'),
        ),
        migrations.AddField(
            model_name='modality',
            name='seo_meta_title',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='seo_meta_description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='seo_primary_keyword',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='modality',
            name='seo_secondary_keywords',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='modality',
            name='related_modalities',
            field=models.ManyToManyField(blank=True, to='common.modality'),
        ),
        migrations.AddField(
            model_name='modality',
            name='gray_zone',
            field=models.BooleanField(default=False, help_text='Whether this modality overlaps with licensed therapy'),
        ),
        # 3. Add composite index for category_ref + cluster
        migrations.AddIndex(
            model_name='modality',
            index=models.Index(fields=['category_ref', 'cluster'], name='common_moda_categor_idx'),
        ),
    ]
