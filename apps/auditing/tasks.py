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
        Agency = apps.get_model('accounts', 'Agency')
        
        # Populate agency_name from agency if not already provided
        if log_data.get('agency_id') and not log_data.get('agency_name'):
            try:
                agency = Agency.objects.get(id=log_data['agency_id'])
                log_data['agency_name'] = agency.agency_name
            except Agency.DoesNotExist:
                logger.warning(f"Agency {log_data['agency_id']} not found. Setting agency_id to None.")
                # If agency doesn't exist, set it to None but keep the cached name if provided
                log_data['agency_id'] = None
        
        SystemLog.objects.create(**log_data)
        
    except Exception as e:
        # Log the error with full traceback for debugging
        import traceback
        logger.error(
            f"Failed to create system log. "
            f"Action: {log_data.get('action_type', 'UNKNOWN')}, "
            f"User: {log_data.get('user_id', 'N/A')}, "
            f"Agency: {log_data.get('agency_id', 'N/A')}. "
            f"Error: {e}\n"
            f"Traceback: {traceback.format_exc()}"
        )