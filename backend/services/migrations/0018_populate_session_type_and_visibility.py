# Data migration to populate session_type and visibility for existing ServiceSessions

from django.db import migrations


def populate_session_type_and_visibility(apps, schema_editor):
    """
    Populate session_type and visibility for existing ServiceSessions based on their service type.

    - Workshops get session_type='workshop', visibility='public'
    - Courses get session_type='course_session', visibility='public'
    - Everything else gets session_type='individual', visibility='private'
    """
    ServiceSession = apps.get_model('services', 'ServiceSession')
    Service = apps.get_model('services', 'Service')
    ServiceType = apps.get_model('services', 'ServiceType')

    # Get service type codes
    try:
        workshop_type = ServiceType.objects.get(code='workshop')
        course_type = ServiceType.objects.get(code='course')
    except ServiceType.DoesNotExist:
        # If types don't exist yet, skip
        return

    # Update workshop sessions
    workshop_sessions = ServiceSession.objects.filter(
        service__service_type=workshop_type
    )
    workshop_sessions.update(
        session_type='workshop',
        visibility='public'
    )
    print(f"Updated {workshop_sessions.count()} workshop sessions")

    # Update course sessions
    course_sessions = ServiceSession.objects.filter(
        service__service_type=course_type
    )
    course_sessions.update(
        session_type='course_session',
        visibility='public'
    )
    print(f"Updated {course_sessions.count()} course sessions")

    # Update individual sessions (everything else)
    # These should already have the default values, but let's be explicit
    other_sessions = ServiceSession.objects.exclude(
        service__service_type__in=[workshop_type, course_type]
    )
    other_sessions.update(
        session_type='individual',
        visibility='private'
    )
    print(f"Updated {other_sessions.count()} individual sessions")


def reverse_populate(apps, schema_editor):
    """
    Reverse migration - set everything back to defaults.
    """
    ServiceSession = apps.get_model('services', 'ServiceSession')
    ServiceSession.objects.all().update(
        session_type='individual',
        visibility='public'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0017_add_session_type_and_visibility_to_servicesession'),
    ]

    operations = [
        migrations.RunPython(
            populate_session_type_and_visibility,
            reverse_populate
        ),
    ]
