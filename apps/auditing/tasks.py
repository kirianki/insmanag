# apps/auditing/tasks.py
from celery import shared_task
from django.apps import apps
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)

@shared_task(name="create_system_log")
def create_system_log(log_data: dict):
    """
    Asynchronously creates a SystemLog entry in the database.
    We get the model dynamically to avoid circular import issues.
    """
    try:
        SystemLog = apps.get_model('auditing', 'SystemLog')
        SystemLog.objects.create(**log_data)
    except Exception as e:
        # Log the error if the database write fails for any reason.
        logger.error(f"Failed to create system log with data {log_data}. Error: {e}")