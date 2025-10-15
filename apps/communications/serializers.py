# apps/communications/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for user notifications.
    """
    class Meta:
        model = Notification
        fields = ['id', 'message', 'is_read', 'policy', 'created_at']
        # User can only update the 'is_read' field via a PATCH request.
        read_only_fields = ['id', 'message', 'policy', 'created_at']