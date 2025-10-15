# apps/auditing/apps.py
from django.apps import AppConfig

class AuditingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.auditing'

    def ready(self):
        """
        This method is called when Django starts.
        We import our signals here to connect the receivers.
        """
        import apps.auditing.signals