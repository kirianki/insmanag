# apps/communications/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema_view, extend_schema

from .models import Notification
from .serializers import NotificationSerializer

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
    # +++ CHANGE: Explicitly define allowed methods. Users can't create or fully update.
    http_method_names = ['get', 'patch', 'delete', 'post', 'head', 'options']

    def get_queryset(self):
        """Users can only ever see their own notifications."""
        return Notification.objects.select_related(
            'user', 'policy'
        ).filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """
        +++ NEW: Override list to include the unread count in the response.
        """
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        
        # Calculate the unread count from the original (unpaginated) queryset
        unread_count = queryset.filter(is_read=False).count()
        
        data = {
            'unread_count': unread_count,
            'results': serializer.data
        }
        
        return self.get_paginated_response(data)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        """Marks all of a user's unread notifications as read."""
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)