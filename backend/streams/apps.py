from django.apps import AppConfig


class StreamsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'streams'
    verbose_name = 'Estuary Streams'

    def ready(self):
        import streams.signals  # noqa: F401