# apps/core/utils.py
import json
import uuid
from datetime import date, datetime

class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle types that the default encoder doesn't,
    like UUID, datetime, and date.
    """
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            # If the object is a UUID, convert it to a string.
            return str(obj)
        if isinstance(obj, (datetime, date)):
            # If the object is a datetime or date, convert it to an ISO 8601 string.
            return obj.isoformat()
        # Let the base class default method raise the TypeError for other types.
        return super().default(obj)


def get_ip_from_request(request):
    """Helper to extract the client's IP address from a request object."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip