# Generated by Django 5.1.3 on 2025-06-10 04:01

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('bookings', '0006_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='user',
            field=models.ForeignKey(help_text='Client making the booking', on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='bookingnote',
            name='author',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='booking_notes', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='bookingnote',
            name='booking',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notes', to='bookings.booking'),
        ),
        migrations.AddField(
            model_name='bookingreminder',
            name='booking',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reminders', to='bookings.booking'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['user', 'status'], name='bookings_bo_user_id_69a5d5_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['practitioner', 'start_time'], name='bookings_bo_practit_b87758_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['service', 'status'], name='bookings_bo_service_b2b755_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['status', 'start_time'], name='bookings_bo_status_3c2736_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['payment_status'], name='bookings_bo_payment_27706e_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['parent_booking'], name='bookings_bo_parent__2d389a_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['service_session'], name='bookings_bo_service_e27d43_idx'),
        ),
        migrations.AddIndex(
            model_name='booking',
            index=models.Index(fields=['start_time', 'end_time'], name='bookings_bo_start_t_1c7039_idx'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=models.Q(('start_time__lt', models.F('end_time'))), name='booking_valid_time_range'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=models.Q(('final_amount_cents__gte', 0)), name='booking_non_negative_amount'),
        ),
        migrations.AddIndex(
            model_name='bookingnote',
            index=models.Index(fields=['booking', '-created_at'], name='bookings_bo_booking_fdabad_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingnote',
            index=models.Index(fields=['author'], name='bookings_bo_author__561a35_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingreminder',
            index=models.Index(fields=['booking', 'scheduled_time'], name='bookings_bo_booking_a220ec_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingreminder',
            index=models.Index(fields=['is_sent', 'scheduled_time'], name='bookings_bo_is_sent_29338d_idx'),
        ),
        migrations.AddIndex(
            model_name='bookingreminder',
            index=models.Index(fields=['reminder_type'], name='bookings_bo_reminde_8c67ef_idx'),
        ),
    ]
