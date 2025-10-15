# apps/auditing/signals.py
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from .tasks import create_system_log

def get_ip_from_request(request):
    """Helper to extract the client's IP address from a request object."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# --- Listener for User Logins ---
# This is the perfect use case for a signal and should be kept.
@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Logs a successful user login event."""
    if not user.agency_id:
        return
        
    log_data = {
        "agency_id": user.agency_id,
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