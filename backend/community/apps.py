from django.apps import AppConfig


class CommunityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'community'
    verbose_name = 'Community'
    
    def ready(self):
        import community.signals
