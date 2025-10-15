# apps/auditing/mixins.py
from .tasks import create_system_log

def get_ip_from_request(request):
    """Helper to extract the client's IP address from a request object."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class AuditLogMixin:
    """
    A ViewSet mixin that automatically logs create, update, and delete actions.
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
            "branch_id": user.branch_id,
            "user_id": user.id,
            "action_type": action_type,
            "details": details or {},
            "ip_address": get_ip_from_request(self.request)
        }
        create_system_log.delay(log_data)

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_CREATED", instance)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        instance = serializer.instance
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_UPDATED", instance)

    def perform_destroy(self, instance):
        # Log before deleting so we can capture the state of the object.
        model_name = instance._meta.verbose_name.upper().replace(" ", "_")
        self._log_action(f"{model_name}_DELETED", instance)
        super().perform_destroy(instance)