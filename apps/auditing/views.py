# apps/auditing/views.py
from rest_framework import viewsets, permissions
from drf_spectacular.utils import extend_schema_view, extend_schema
from django_filters.rest_framework import DjangoFilterBackend

from .models import SystemLog
from .serializers import SystemLogSerializer
from .filters import SystemLogFilter
from apps.accounts.permissions import IsSuperUser, IsAgencyAdmin, IsBranchManager

@extend_schema_view(
    list=extend_schema(summary="List System Audit Logs (Scoped by Role)"),
    retrieve=extend_schema(summary="Get a specific System Audit Log"),
)
class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing the system-wide audit trail.
    Access is scoped based on the user's role and requires a specific permission.
    """
    serializer_class = SystemLogSerializer
    permission_classes = [permissions.IsAuthenticated] # Base permission
    
    filter_backends = [DjangoFilterBackend]
    filterset_class = SystemLogFilter

    def get_queryset(self):
        user = self.request.user
        base_queryset = SystemLog.objects.select_related('user', 'branch', 'agency')

        if user.is_superuser:
            return base_queryset.all()
        
        # --- FIX: Check for the new, unique custom permission ---
        # The format is always "app_label.codename"
        if not user.has_perm('auditing.can_view_audit_trail'):
            return SystemLog.objects.none()

        # If the user has the permission, scope the data based on their role.
        if user.is_agency_admin:
            return base_queryset.filter(agency=user.agency)
        if user.is_branch_manager:
            return base_queryset.filter(branch=user.branch)
            
        return SystemLog.objects.none()