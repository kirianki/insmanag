# apps/communications/reminder_models.py

from django.db import models
from django.db.models import JSONField
from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import User, Agency
from apps.policies.models import Policy
from apps.customers.models import Customer


class ReminderType(models.TextChoices):
    """Types of reminders that can be sent"""
    PAYMENT_DUE = "PAYMENT_DUE", "Payment Due"
    PAYMENT_OVERDUE = "PAYMENT_OVERDUE", "Payment Overdue"
    POLICY_EXPIRING = "POLICY_EXPIRING", "Policy Expiring"
    AGENT_DAILY_SUMMARY = "AGENT_DAILY_SUMMARY", "Agent Daily Summary"
    AGENT_URGENT_ALERT = "AGENT_URGENT_ALERT", "Agent Urgent Alert"
    AGENT_RENEWAL_OPP = "AGENT_RENEWAL_OPP", "Agent Renewal Opportunities"


class ReminderTemplate(UUIDModel, TimestampedModel):
    """
    Customizable templates for reminder messages.
    Supports placeholders like {{customer_name}}, {{policy_number}}, etc.
    """
    reminder_type = models.CharField(
        max_length=50, 
        choices=ReminderType.choices,
        db_index=True
    )
    name = models.CharField(max_length=255, help_text="Descriptive name for this template")
    
    # SMS Template (shorter, plain text)
    sms_template = models.TextField(
        blank=True,
        help_text="SMS message template with {{placeholders}}. Keep under 160 characters."
    )
    
    # Email Templates (can be longer, supports HTML)
    email_subject_template = models.CharField(
        max_length=255,
        blank=True,
        help_text="Email subject line with {{placeholders}}"
    )
    email_body_template = models.TextField(
        blank=True,
        help_text="Email body template (plain text) with {{placeholders}}"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="If False, this template won't be used"
    )
    
    class Meta:
        ordering = ['reminder_type', 'name']
        verbose_name = "Reminder Template"
        verbose_name_plural = "Reminder Templates"
    
    def __str__(self):
        return f"{self.get_reminder_type_display()} - {self.name}"


class ReminderLog(UUIDModel, TimestampedModel):
    """
    Tracks all reminders sent to customers and agents for auditing and preventing duplicates.
    """
    
    class RecipientType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        AGENT = "AGENT", "Agent"
    
    class Channel(models.TextChoices):
        SMS = "SMS", "SMS"
        EMAIL = "EMAIL", "Email"
        BOTH = "BOTH", "Both"
    
    class Status(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"
        DELIVERED = "DELIVERED", "Delivered"
    
    reminder_type = models.CharField(
        max_length=50,
        choices=ReminderType.choices,
        db_index=True
    )
    
    recipient_type = models.CharField(
        max_length=20,
        choices=RecipientType.choices
    )
    
    # Either customer or agent will be populated, not both
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="reminder_logs",
        null=True,
        blank=True
    )
    agent = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reminder_logs",
        null=True,
        blank=True
    )
    
    # Optional policy reference
    policy = models.ForeignKey(
        Policy,
        on_delete=models.SET_NULL,
        related_name="reminder_logs",
        null=True,
        blank=True
    )
    
    channel = models.CharField(
        max_length=10,
        choices=Channel.choices,
        default=Channel.BOTH
    )
    
    # The actual content sent
    sms_content = models.TextField(blank=True)
    email_subject = models.CharField(max_length=255, blank=True)
    email_content = models.TextField(blank=True)
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True
    )
    
    # Response from SMS/Email provider
    delivery_status = JSONField(
        default=dict,
        blank=True,
        help_text="Provider response data (Africa's Talking, SMTP, etc.)"
    )
    
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Reminder Log"
        verbose_name_plural = "Reminder Logs"
        indexes = [
            models.Index(fields=['reminder_type', 'created_at']),
            models.Index(fields=['customer', 'reminder_type']),
            models.Index(fields=['agent', 'reminder_type']),
        ]
    
    def __str__(self):
        recipient = self.customer or self.agent
        return f"{self.get_reminder_type_display()} to {recipient} - {self.get_status_display()}"


class ReminderSettings(UUIDModel, TimestampedModel):
    """
    Agency-specific configuration for when and how reminders should be sent.
    """
    agency = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name="reminder_settings"
    )
    
    reminder_type = models.CharField(
        max_length=50,
        choices=ReminderType.choices,
        db_index=True
    )
    
    enabled = models.BooleanField(
        default=True,
        help_text="Enable/disable this reminder type for this agency"
    )
    
    # For time-based reminders (e.g., "3 days before expiry")
    days_before = models.IntegerField(
        null=True,
        blank=True,
        help_text="For expiry/due reminders: how many days before to send"
    )
    
    # Time of day to send (for scheduled reminders)
    time_of_day = models.TimeField(
        null=True,
        blank=True,
        help_text="Preferred time to send this reminder"
    )
    
    # Channel preferences
    channels_enabled = JSONField(
        default=dict,
        help_text='{"sms": true, "email": true}'
    )
    
    class Meta:
        ordering = ['agency', 'reminder_type']
        verbose_name = "Reminder Setting"
        verbose_name_plural = "Reminder Settings"
        unique_together = [['agency', 'reminder_type', 'days_before']]
    
    def __str__(self):
        return f"{self.agency.name} - {self.get_reminder_type_display()}"
