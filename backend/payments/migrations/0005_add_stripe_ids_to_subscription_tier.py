# Generated manually to add Stripe IDs to SubscriptionTier

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptiontier',
            name='stripe_product_id',
            field=models.CharField(blank=True, max_length=255, null=True, help_text='Stripe Product ID'),
        ),
        migrations.AddField(
            model_name='subscriptiontier',
            name='stripe_monthly_price_id',
            field=models.CharField(blank=True, max_length=255, null=True, help_text='Stripe Price ID for monthly billing'),
        ),
        migrations.AddField(
            model_name='subscriptiontier',
            name='stripe_annual_price_id',
            field=models.CharField(blank=True, max_length=255, null=True, help_text='Stripe Price ID for annual billing'),
        ),
    ]