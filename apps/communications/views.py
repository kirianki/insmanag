from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import Notification
from .reminder_models import ReminderTemplate, ReminderLog
from .serializers import (
    NotificationSerializer, 
    ReminderTemplateSerializer, 
    ReminderLogSerializer
)

@extend_schema_view(
    list=extend_schema(summary="List User's Notifications (with Unread Count)"),
    retrieve=extend_schema(summary="Get a Notification"),
    partial_update=extend_schema(summary="Mark a Notification as Read/Unread"),
    destroy=extend_schema(summary="Delete a Notification"),
    mark_all_as_read=extend_schema(
        summary="Mark all Notifications as Read",
        request=None,
        responses={204: None}
    ),
)
class NotificationViewSet(viewsets.ModelViewSet):
    """
    API endpoint for users to view and manage their personal notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'post', 'head', 'options']

    def get_queryset(self):
        """Users can only ever see their own notifications."""
        return Notification.objects.select_related(
            'user', 'policy'
        ).filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """
        Override list to include the unread count in the response.
        """
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        # Calculate the unread count from the original (unpaginated) queryset
        unread_count = queryset.filter(is_read=False).count()
        
        # If there's a page, the response is already paginated
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            paginated_data = self.get_paginated_response(serializer.data).data
            paginated_data['unread_count'] = unread_count
            return Response(paginated_data)

        # If not paginated, construct the response manually
        serializer = self.get_serializer(queryset, many=True)
        data = {
            'unread_count': unread_count,
            'results': serializer.data
        }
        return Response(data)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        """Marks all of a user's unread notifications as read."""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReminderTemplateViewSet(viewsets.ModelViewSet):
    """
    Administrative viewset for managing reminder templates.
    """
    queryset = ReminderTemplate.objects.all()
    serializer_class = ReminderTemplateSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['reminder_type', 'is_active']
    search_fields = ['name', 'sms_template', 'email_subject_template']


class ReminderLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Administrative viewset for viewing communication logs.
    """
    queryset = ReminderLog.objects.all().select_related('customer', 'agent', 'policy')
    serializer_class = ReminderLogSerializer
    permission_classes = [permissions.IsAuthenticated] # Restrict to staff in production or based on roles
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['reminder_type', 'recipient_type', 'status', 'channel']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']
    search_fields = [
        'customer__full_name', 'agent__username', 
        'policy__policy_number', 'sms_content', 'email_subject'
    ]