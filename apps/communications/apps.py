# apps/communications/apps.py
from django.apps import AppConfig

class CommunicationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.communications'

    def ready(self):
        # This line is crucial for the signals to be discovered and connected.
        import apps.communications.signals