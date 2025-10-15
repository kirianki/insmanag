# apps/accounts/views.py
from __future__ import annotations
from typing import Any
from uuid import UUID

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status, viewsets, exceptions
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.contrib.auth.models import Group, Permission

from apps.auditing.mixins import AuditLogMixin
from .models import Agency, AgencyBranch, User
from .permissions import IsAgencyAdmin, IsObjectInScope, IsSuperUser
from .serializers import (
    AgencyBranchSerializer,
    AgencyOnboardingSerializer,
    AgencySerializer,
    ChangePasswordSerializer,
    MyTokenObtainPairSerializer,
    PermissionSerializer,
    RoleSerializer,
    UserSerializer,
)


class AgencyOnboardingView(generics.CreateAPIView):
    """Create a new Agency and its Admin user. Superuser only."""
    serializer_class = AgencyOnboardingSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperUser]

    @extend_schema(summary="Onboard New Agency and Admin User")
    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        return super().post(request, *args, **kwargs)


class MyTokenObtainPairView(TokenObtainPairView):
    """Custom token endpoint with enriched JWT claims."""
    serializer_class = MyTokenObtainPairSerializer


@extend_schema_view(
    list=extend_schema(summary="List Agencies (Scoped)"),
    retrieve=extend_schema(summary="Get Agency Details"),
    update=extend_schema(summary="Update Agency (Admins)"),
    partial_update=extend_schema(summary="Partially Update Agency (Admins)"),
    destroy=extend_schema(summary="Delete Agency (Superuser only)"),
)
class AgencyViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        user: User = self.request.user
        queryset = Agency.objects.prefetch_related("branches").order_by("agency_name")
        if user.is_superuser:
            return queryset
        if getattr(user, "agency", None):
            return queryset.filter(pk=user.agency.pk)
        return Agency.objects.none()

    def get_permissions(self):
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsSuperUser()]
        if self.action in ["update", "partial_update"]:
            return [permissions.IsAuthenticated(), IsAgencyAdmin()]
        return super().get_permissions()


@extend_schema_view(
    list=extend_schema(summary="List an Agency's Branches"),
    create=extend_schema(summary="Create Branch (Admins)"),
)
class AgencyBranchViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Manages branches for a specific agency.
    Permissions are handled carefully to ensure a user can only affect
    branches within their own agency's scope.
    """
    serializer_class = AgencyBranchSerializer

    def get_permissions(self):
        """
        Dynamically set permissions based on the action.
        - Write actions (create, update, etc.) require object-level scope checks.
        - Read actions are scoped within get_queryset.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsObjectInScope()]
        return [permissions.IsAuthenticated()]

    def get_agency(self):
        """
        Helper method to get the parent agency from the URL and check permissions.
        This now safely casts UUIDs and logs for easier debugging.
        """
        agency_pk = self.kwargs.get("agency_pk")
        print(f"[DEBUG] get_agency() called with agency_pk={agency_pk}")

        try:
            # Explicitly cast to UUID to prevent string vs UUIDField mismatch
            agency_uuid = UUID(agency_pk)
            agency = Agency.objects.get(pk=agency_uuid)
        except (ValueError, Agency.DoesNotExist, TypeError):
            raise exceptions.NotFound(f"Agency with ID {agency_pk} not found.")

        # NEW: Smooth permission check - ensure user can access this agency
        if not IsObjectInScope().has_object_permission(self.request, None, agency):
            raise exceptions.PermissionDenied("You do not have permission to access this agency.")

        return agency

    def get_queryset(self):
        """
        NEW: Improved queryset for smoother frontend - always scoped to user's agency/branch
        Returns branches visible to the user, ordered by name.
        """
        try:
            agency = self.get_agency()
            user = self.request.user
            if user.is_superuser or user.is_agency_admin:
                return AgencyBranch.objects.filter(agency=agency).order_by("branch_name")
            elif user.is_branch_manager:
                # Branch managers see only their branch (and perhaps siblings in same agency)
                return AgencyBranch.objects.filter(agency=agency, id=user.branch.id).order_by("branch_name")
            return AgencyBranch.objects.none()
        except exceptions.PermissionDenied:
            # If permission denied, return empty queryset
            return AgencyBranch.objects.none()

    def perform_create(self, serializer: AgencyBranchSerializer) -> None:
        """
        Set the agency on the new branch after ensuring permissions.
        """
        agency = self.get_agency()  # This single call fetches the agency AND checks perms
        serializer.save(agency=agency)


@extend_schema_view(
    list=extend_schema(summary="List Staff Users (Scoped)"),
    create=extend_schema(summary="Create Staff User (Admins)"),
)
class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        user: User = self.request.user
        # NEW: Enhanced prefetch for smoother frontend - include branch_detail
        queryset = User.objects.select_related("profile", "agency", "branch", "manager").prefetch_related("groups")
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            if branch_id == 'unassigned':
                 queryset = queryset.filter(branch__isnull=True)
            else:
                 queryset = queryset.filter(branch_id=branch_id)

        if user.is_superuser:
            return queryset.order_by("email")
        if getattr(user, "is_agency_admin", False):
            return queryset.filter(agency=user.agency).order_by("email")
        if getattr(user, "is_branch_manager", False):
            # NEW: Branch managers see their team + themselves
            return queryset.filter(Q(branch=user.branch) | Q(pk=user.pk)).order_by("email")
        return queryset.filter(pk=user.pk)

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            if self.request.user.is_superuser:
                return [permissions.IsAuthenticated(), IsSuperUser()]
            return [permissions.IsAuthenticated(), IsAgencyAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer: UserSerializer) -> None:
        user: User = self.request.user
        if getattr(user, "is_agency_admin", False):
            serializer.save(agency=user.agency)
            return
        if user.is_superuser:
            if "agency" not in serializer.validated_data:
                raise serializers.ValidationError({"agency": "Agency is required when creating a user as a superuser."})
            serializer.save()
            return
        raise permissions.PermissionDenied("You do not have permission to create users.")


class ChangePasswordView(generics.UpdateAPIView):
    """Allow authenticated users to change their own password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(summary="Change Your Password")
    def put(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)

    def get_object(self, queryset=None) -> User:
        return self.request.user


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoint for listing user roles (groups)."""
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin)]
    queryset = Group.objects.prefetch_related("permissions").order_by("name")


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoint for listing all permissions."""
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin)]
    queryset = Permission.objects.all().order_by("name")


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's own profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> User:
        return self.request.user