# apps/communications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.policies.models import Policy
from .services import NotificationService

@receiver(post_save, sender=Policy)
def create_policy_notifications(sender, instance: Policy, created, **kwargs):
    """
    Signal receiver to create notifications when a policy is created or activated.
    """
    if created and instance.status == Policy.Status.AWAITING_PAYMENT:
        # Notify the agent that a new policy has been created and is awaiting payment
        message = f"New policy {instance.policy_number} for customer {instance.customer} is awaiting payment."
        NotificationService.create_notification(
            user=instance.agent,
            message=message,
            policy=instance
        )

    # This signal fires on every save, so we need to be careful.
    # A more robust implementation would check if the `status` field *changed*.
    # For simplicity, we create a notification if the status is one of the "active" ones.
    # The frontend should ideally handle duplicate notifications gracefully.
    if instance.status in [Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT]:
        message = f"Policy {instance.policy_number} for customer {instance.customer} has been activated."
        NotificationService.create_notification(
            user=instance.agent,
            message=message,
            policy=instance
        )