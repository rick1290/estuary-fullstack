from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0013_rename_payments_ea_public__idx_payments_ea_public__06ea53_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usercredittransaction',
            name='transaction_type',
            field=models.CharField(
                choices=[
                    ('purchase', 'Purchase'),
                    ('usage', 'Usage'),
                    ('credit_applied', 'Credit Applied'),
                    ('refund', 'Refund'),
                    ('adjustment', 'Adjustment'),
                    ('bonus', 'Bonus'),
                    ('transfer', 'Transfer'),
                    ('expiry', 'Expiry'),
                ],
                max_length=20,
            ),
        ),
    ]
