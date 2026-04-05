# apps/auditing/serializers.py
from rest_framework import serializers
from .models import SystemLog

class SystemLogSerializer(serializers.ModelSerializer):
    """
    Serializer for the SystemLog model.
    Provides a read-only representation of an audit log entry.
    """
    # Provide human-readable context for the user who performed the action.
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True, default='System/Deleted User')
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True, allow_null=True, default='N/A')
    # Use the cached agency_name field from the model (not the related object)
    
    class Meta:
        model = SystemLog
        fields = [
            'id',
            'agency',
            'agency_name', # Read-only context
            'branch',
            'branch_name', # Read-only context
            'user',
            'user_email', # Read-only context
            'action_type',
            'details',
            'ip_address',
            'created_at',
        ]
        # This is an audit log, so all fields are read-only via the API.
        read_only_fields = fields