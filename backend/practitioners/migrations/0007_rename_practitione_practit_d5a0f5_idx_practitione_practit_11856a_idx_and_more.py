# Generated by Django 5.1.3 on 2025-06-21 03:00

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0006_merge_20250621_0243'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='clientnote',
            new_name='practitione_practit_11856a_idx',
            old_name='practitione_practit_d5a0f5_idx',
        ),
        migrations.RenameIndex(
            model_name='clientnote',
            new_name='practitione_practit_7e8148_idx',
            old_name='practitione_practit_4e1c8a_idx',
        ),
        migrations.RenameIndex(
            model_name='clientnote',
            new_name='practitione_client__292e5d_idx',
            old_name='practitione_client__7f8c9a_idx',
        ),
    ]
