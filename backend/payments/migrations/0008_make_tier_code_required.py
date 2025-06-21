# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0007_populate_subscription_tier_codes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='subscriptiontier',
            name='code',
            field=models.CharField(
                choices=[('basic', 'Basic'), ('professional', 'Professional'), ('premium', 'Premium')],
                help_text='Fixed tier identifier used in code',
                max_length=20,
                unique=True
            ),
        ),
    ]