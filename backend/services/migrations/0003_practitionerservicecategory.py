# Generated migration for PractitionerServiceCategory

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('practitioners', '0002_initial'),
        ('services', '0002_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PractitionerServiceCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(help_text='URL-friendly version of name', max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('icon', models.CharField(blank=True, help_text='Icon class or identifier', max_length=50, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0, help_text='Display order for drag-drop sorting')),
                ('color', models.CharField(blank=True, help_text='Hex color for UI display', max_length=7, null=True)),
                ('practitioner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_categories', to='practitioners.practitioner')),
            ],
            options={
                'verbose_name': 'Practitioner Service Category',
                'verbose_name_plural': 'Practitioner Service Categories',
                'ordering': ['order', 'name'],
                'indexes': [
                    models.Index(fields=['practitioner', 'is_active'], name='services_pr_practit_b7e8e3_idx'),
                    models.Index(fields=['practitioner', 'order'], name='services_pr_practit_97a4e4_idx'),
                ],
            },
        ),
        migrations.AddField(
            model_name='service',
            name='practitioner_category',
            field=models.ForeignKey(blank=True, help_text="Practitioner's custom category", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='services', to='services.practitionerservicecategory'),
        ),
        migrations.AlterUniqueTogether(
            name='practitionerservicecategory',
            unique_together={('practitioner', 'slug'), ('practitioner', 'name')},
        ),
    ]