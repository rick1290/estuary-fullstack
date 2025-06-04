from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'
    
    def ready(self):
        """
        Import signals when the app is ready.
        This ensures that the signals are registered when the app is loaded.
        """
        import payments.signals
