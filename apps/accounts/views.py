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
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.auditing.mixins import AuditLogMixin
from apps.core.pagination import LargeResultsSetPagination
from .models import Agency, AgencyBranch, User
from .permissions import IsAgencyAdmin, IsObjectInScope, IsSuperUser
from .serializers import (
    AgencyBranchSerializer,
    AgencyOnboardingSerializer,
    AgencySerializer,
    ChangePasswordSerializer,
    CurrentUserSerializer,
    MyTokenObtainPairSerializer,
    PermissionSerializer,
    RoleSerializer,
    UserSerializer,
    UserProfileSerializer,
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsObjectInScope()]
        return [permissions.IsAuthenticated()]

    def get_agency(self):
        agency_pk = self.kwargs.get("agency_pk")
        try:
            agency_uuid = UUID(agency_pk)
            agency = Agency.objects.get(pk=agency_uuid)
        except (ValueError, Agency.DoesNotExist, TypeError):
            raise exceptions.NotFound(f"Agency with ID {agency_pk} not found.")
        if not IsObjectInScope().has_object_permission(self.request, None, agency):
            raise exceptions.PermissionDenied("You do not have permission to access this agency.")
        return agency

    def get_queryset(self):
        try:
            agency = self.get_agency()
            user = self.request.user
            if user.is_superuser or user.is_agency_admin:
                return AgencyBranch.objects.filter(agency=agency).order_by("branch_name")
            elif user.is_branch_manager:
                return AgencyBranch.objects.filter(agency=agency, id=user.branch.id).order_by("branch_name")
            return AgencyBranch.objects.none()
        except exceptions.PermissionDenied:
            return AgencyBranch.objects.none()

    def perform_create(self, serializer: AgencyBranchSerializer) -> None:
        agency = self.get_agency()
        super().perform_create(serializer, agency=agency)


@extend_schema_view(
    list=extend_schema(summary="List Staff Users (Scoped)"),
    create=extend_schema(summary="Create Staff User (Admins)"),
)
class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    pagination_class = LargeResultsSetPagination

    def get_queryset(self):
        user: User = self.request.user
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
            return queryset.filter(Q(branch=user.branch) | Q(pk=user.pk)).order_by("email")
        return queryset.filter(pk=user.pk)

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            if self.request.user.is_superuser:
                return [permissions.IsAuthenticated(), IsSuperUser()]
            return [permissions.IsAuthenticated(), IsAgencyAdmin()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        # Prevent target user from deleting themselves
        if instance == user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)

        # Reassignment logic
        from django.db import transaction
        from apps.policies.models import Policy
        from apps.commissions.models import StaffCommission, PayoutBatch
        from apps.customers.models import Customer, CustomerDocument, Lead, Renewal
        from apps.finances.models import PayrollRun, StaffPayment, Expense

        with transaction.atomic():
            # 1. Find target Agency Admin
            target_admin = User.objects.filter(
                agency=instance.agency,
                groups__name='Agency Admin',
                is_active=True
            ).exclude(pk=instance.pk).order_by('date_joined').first()

            if not target_admin:
                return Response(
                    {"detail": "Cannot delete user. No other active Agency Admin found to reassign records to."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Perform bulk updates
            Policy.objects.filter(agent=instance).update(agent=target_admin)
            StaffCommission.objects.filter(agent=instance).update(agent=target_admin)
            Customer.objects.filter(assigned_agent=instance).update(assigned_agent=target_admin)
            Customer.objects.filter(kyc_verified_by=instance).update(kyc_verified_by=target_admin)
            CustomerDocument.objects.filter(verified_by=instance).update(verified_by=target_admin)
            Lead.objects.filter(assigned_agent=instance).update(assigned_agent=target_admin)
            Renewal.objects.filter(created_by=instance).update(created_by=target_admin)
            PayoutBatch.objects.filter(initiated_by=instance).update(initiated_by=target_admin)
            PayrollRun.objects.filter(processed_by=instance).update(processed_by=target_admin)
            StaffPayment.objects.filter(user=instance).update(user=target_admin)
            Expense.objects.filter(recorded_by=instance).update(recorded_by=target_admin)

            # 3. Delete the user
            self.perform_destroy(instance)
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_create(self, serializer: UserSerializer) -> None:
        user: User = self.request.user
        if getattr(user, "is_agency_admin", False):
            super().perform_create(serializer, agency=user.agency)
            return
        if user.is_superuser:
            if "agency" not in serializer.validated_data:
                raise serializers.ValidationError({"agency": "Agency is required when creating a user as a superuser."})
            super().perform_create(serializer)
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
    """
    Handles GET and PATCH for the authenticated user's profile.
    Supports both JSON and multipart/form-data for file uploads.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CurrentUserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        """Returns the currently authenticated user."""
        return self.request.user

    def update(self, request, *args, **kwargs):
        """
        Custom update method to handle both User and UserProfile updates from a single request.
        Properly handles file uploads via multipart/form-data.
        """
        partial = kwargs.pop('partial', True)
        user = self.get_object()
        profile = user.profile

        # Separate data for User and UserProfile models
        user_data = {}
        profile_data = {}

        # Categorize incoming data
        for key, value in request.data.items():
            if key in ['first_name', 'last_name']:
                user_data[key] = value
            elif key in ['phone_number', 'bio', 'profile_picture']:
                profile_data[key] = value

        # Update User fields if provided
        if user_data:
            user_serializer = self.get_serializer(user, data=user_data, partial=partial)
            user_serializer.is_valid(raise_exception=True)
            self.perform_update(user_serializer)

        # Update UserProfile fields if provided
        if profile_data:
            profile_serializer = UserProfileSerializer(
                profile, 
                data=profile_data, 
                partial=partial,
                context={'request': request}
            )
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()

        # Return the complete updated user data
        return Response(self.get_serializer(user).data)