# apps/communications/services.py
from .models import Notification
from apps.accounts.models import User
from apps.policies.models import Policy

class NotificationService:
    """A centralized service for creating user notifications."""

    @staticmethod
    def create_notification(user: User, message: str, policy: Policy = None):
        """
        Creates a new notification for a given user.
        """
        if not user:
            return
        
        Notification.objects.create(
            user=user,
            message=message,
            policy=policy
        )