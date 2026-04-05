# apps/communications/models.py
from django.db import models
from apps.core.models import UUIDModel, TimestampedModel
from apps.policies.models import Policy
from apps.accounts.models import User

class Notification(UUIDModel, TimestampedModel):
    """
    Represents an in-app notification for a specific user.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    
    # Optional: Link the notification to a specific policy for easy navigation in the frontend.
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"For {self.user.email}: {self.message[:40]}..."


# Import reminder models to register them with Django
from .reminder_models import ReminderTemplate, ReminderLog, ReminderSettings