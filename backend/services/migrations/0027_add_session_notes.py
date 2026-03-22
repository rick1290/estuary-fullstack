from django.db import migrations, models


def column_exists(schema_editor, table, column):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
            [table, column],
        )
        return cursor.fetchone() is not None


def add_field_if_missing(apps, schema_editor):
    """Add columns only if they don't already exist (idempotent)."""
    if not column_exists(schema_editor, 'service_sessions', 'practitioner_notes'):
        schema_editor.add_field(
            apps.get_model('services', 'ServiceSession'),
            models.TextField(blank=True, help_text='Private notes from practitioner about this session', null=True),
        )
    if not column_exists(schema_editor, 'service_sessions', 'shared_notes'):
        schema_editor.add_field(
            apps.get_model('services', 'ServiceSession'),
            models.TextField(blank=True, help_text='Notes shared with all participants', null=True),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0026_populate_service_types'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='servicesession',
                    name='practitioner_notes',
                    field=models.TextField(blank=True, help_text='Private notes from practitioner about this session', null=True),
                ),
                migrations.AddField(
                    model_name='servicesession',
                    name='shared_notes',
                    field=models.TextField(blank=True, help_text='Notes shared with all participants', null=True),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE service_sessions ADD COLUMN IF NOT EXISTS practitioner_notes text NULL;
                        ALTER TABLE service_sessions ADD COLUMN IF NOT EXISTS shared_notes text NULL;
                    """,
                    reverse_sql="""
                        ALTER TABLE service_sessions DROP COLUMN IF EXISTS practitioner_notes;
                        ALTER TABLE service_sessions DROP COLUMN IF EXISTS shared_notes;
                    """,
                ),
            ],
        ),
    ]
