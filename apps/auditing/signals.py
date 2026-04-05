# apps/auditing/signals.py
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from apps.core.utils import get_ip_from_request
from .tasks import create_system_log


# --- Listener for User Logins ---
# This is the perfect use case for a signal and should be kept.
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Logs a successful user login event."""
    if not user.agency_id:
        return
        
    log_data = {
        "agency_id": user.agency_id,
        "agency_name": user.agency.agency_name if user.agency else None,
        "branch_id": user.branch_id,
        "user_id": user.id,
        "action_type": "USER_LOGIN_SUCCESS",
        "details": {
            "email": user.email,
            "message": f"User '{user.email}' successfully logged in."
        },
        "ip_address": get_ip_from_request(request)
    }
    create_system_log.delay(log_data)

# --- The other post_save signals for Policy and Commission have been removed ---
# They are now handled automatically by the AuditLogMixin in their respective ViewSets.