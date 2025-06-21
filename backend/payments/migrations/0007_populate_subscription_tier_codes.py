# Generated manually
from django.db import migrations


def populate_tier_codes(apps, schema_editor):
    SubscriptionTier = apps.get_model('payments', 'SubscriptionTier')
    
    # First, let's clean up - keep only the main 3 tiers
    # Delete 'Free' and 'Entry' tiers if they exist
    SubscriptionTier.objects.filter(name__in=['Free', 'Entry']).delete()
    
    # Map existing tier names to codes
    tier_mappings = {
        'Basic': 'basic',
        'Professional': 'professional',
        'Premium': 'premium',
    }
    
    for tier in SubscriptionTier.objects.all():
        if tier.name in tier_mappings:
            tier.code = tier_mappings[tier.name]
            tier.save()
        else:
            # For any unmapped tiers, delete them
            print(f"Deleting unmapped tier: {tier.name}")
            tier.delete()


def reverse_func(apps, schema_editor):
    SubscriptionTier = apps.get_model('payments', 'SubscriptionTier')
    SubscriptionTier.objects.update(code=None)


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_add_subscription_tier_code'),
    ]

    operations = [
        migrations.RunPython(populate_tier_codes, reverse_func),
    ]