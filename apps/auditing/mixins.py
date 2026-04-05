# apps/auditing/mixins.py
from apps.core.utils import get_ip_from_request
from .tasks import create_system_log

class AuditLogMixin:
    """
    A ViewSet mixin that automatically logs create, update, and delete actions.
    Now supports passing kwargs to serializer.save() for custom logic in subclasses.
    """
    def _log_action(self, action_type, instance=None, details=None):
        """Helper method to dispatch the log creation task."""
        user = self.request.user
        
        # If there's no user or the user isn't part of an agency, do not log.
        if not user or not user.is_authenticated or not user.agency_id:
            return

        # Use the ViewSet's serializer to get a consistent representation of the object.
        if instance and not details:
            details = self.get_serializer(instance).data
            
        log_data = {
            "agency_id": user.agency_id,
            "agency_name": user.agency.agency_name if user.agency else None,
            "branch_id": user.branch_id,
            "user_id": user.id,
            "action_type": action_type,
            "details": details or {},
            "ip_address": get_ip_from_request(self.request)
        }
        create_system_log.delay(log_data)

    def perform_create(self, serializer, **kwargs):
        """
        Create the instance and log the action.
        Accepts **kwargs to pass additional arguments to serializer.save()
        """
        instance = serializer.save(**kwargs)
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_CREATED", instance)

    def perform_update(self, serializer, **kwargs):
        """
        Update the instance and log the action.
        Accepts **kwargs to pass additional arguments to serializer.save()
        """
        instance = serializer.save(**kwargs)
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_UPDATED", instance)

    def perform_destroy(self, instance):
        """
        Log before deleting so we can capture the state of the object.
        """
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_DELETED", instance)
        instance.delete()