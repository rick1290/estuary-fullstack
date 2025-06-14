from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'workflows'
    verbose_name = 'Temporal Workflows'
    
    def ready(self):
        """Initialize workflow registry when Django starts"""
        from .registry import registry
        # Pre-load the registry to catch any import errors early
        registry.load()