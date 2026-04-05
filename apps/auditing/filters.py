import django_filters
from .models import SystemLog

class SystemLogFilter(django_filters.FilterSet):
    # Text Search
    user_email = django_filters.CharFilter(field_name='user__email', lookup_expr='icontains', label="User Email")
    action_type = django_filters.CharFilter(lookup_expr='icontains', label="Action Type")
    
    # Date Range
    created_at = django_filters.DateFromToRangeFilter(label="Date Range")

    class Meta:
        model = SystemLog
        fields = [
            'agency',
            'branch',
            'user',
            'action_type',
        ]
