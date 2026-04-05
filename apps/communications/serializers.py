# apps/communications/serializers.py
from rest_framework import serializers
from .models import Notification
from .reminder_models import ReminderTemplate, ReminderLog

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for user notifications.
    """
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'policy', 'created_at']
        # User can only update the 'is_read' field via a PATCH request.
        read_only_fields = ['id', 'message', 'policy', 'created_at']


class ReminderTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for reminder templates.
    """
    reminder_type_display = serializers.CharField(source='get_reminder_type_display', read_only=True)

    class Meta:
        model = ReminderTemplate
        fields = [
            'id', 'reminder_type', 'reminder_type_display', 'name', 
            'sms_template', 'email_subject_template', 'email_body_template', 
            'is_active', 'created_at', 'updated_at'
        ]


class ReminderLogSerializer(serializers.ModelSerializer):
    """
    Serializer for reminder logs with expanded details.
    """
    reminder_type_display = serializers.CharField(source='get_reminder_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recipient_name = serializers.SerializerMethodField()
    policy_number = serializers.CharField(source='policy.policy_number', read_only=True, default=None)

    class Meta:
        model = ReminderLog
        fields = [
            'id', 'reminder_type', 'reminder_type_display', 'recipient_type', 
            'recipient_name', 'policy', 'policy_number', 'channel', 
            'sms_content', 'email_subject', 'email_content', 'status', 
            'status_display', 'delivery_status', 'sent_at', 'error_message', 'created_at'
        ]

    def get_recipient_name(self, obj):
        if obj.recipient_type == ReminderLog.RecipientType.CUSTOMER and obj.customer:
            return obj.customer.full_name
        if obj.recipient_type == ReminderLog.RecipientType.AGENT and obj.agent:
            return obj.agent.get_full_name() or obj.agent.username
        return "Unknown"