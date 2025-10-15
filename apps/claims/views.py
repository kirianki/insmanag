# apps/claims/views.py
from django.db import transaction
from rest_framework import viewsets, permissions, exceptions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema_view, extend_schema 
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

# --- THIS IS THE LINE TO BE ADDED ---
from .filters import ClaimFilter 
from .models import Claim, ClaimDocument
from .serializers import ClaimSerializer, ClaimDocumentSerializer, SettleClaimSerializer
from apps.auditing.mixins import AuditLogMixin
from apps.accounts.permissions import IsSuperUser, IsAgencyAdmin, IsBranchManager, IsObjectInScope
from apps.policies.models import Policy
from apps.customers.models import Customer

@extend_schema_view(
    list=extend_schema(summary="List Claims (Scoped by Role)"),
    create=extend_schema(summary="Create a new Claim (FNOL)"),
    approve=extend_schema(summary="Approve a Claim (Admins/Managers only)"),
    settle=extend_schema(summary="Settle a Claim (Admins/Managers only)"),
    reject=extend_schema(summary="Reject a Claim (Admins/Managers only)")
)
class ClaimViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [DjangoFilterBackend]
    
    # --- THIS IS THE MODIFIED LINE ---
    # We replace filterset_fields with our custom filterset_class.
    filterset_class = ClaimFilter

    def get_queryset(self):
        user = self.request.user
        qs = Claim.objects.select_related('policy', 'claimant', 'reported_by', 'agency', 'branch')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(agency=user.agency)
        if user.is_branch_manager: return qs.filter(branch=user.branch)
        if user.is_agent: return qs.filter(policy__agent=user)
        return Claim.objects.none()

    def get_serializer_context(self):
        """Provide scoped querysets to the serializer for dropdown fields."""
        context = super().get_serializer_context()
        if self.action in ['create', 'update', 'partial_update']:
            user = self.request.user
            context['policies_qs'] = self._get_scoped_queryset(Policy, user)
            context['claimants_qs'] = self._get_scoped_queryset(Customer, user)
        return context
    
    def _get_scoped_queryset(self, model, user):
        """Helper to get a scoped queryset for either Policy or Customer."""
        if user.is_superuser: return model.objects.all()
        if user.is_agency_admin: return model.objects.filter(agency=user.agency)
        if user.is_branch_manager: return model.objects.filter(branch=user.branch)
        if user.is_agent: 
            filter_key = 'agent' if model == Policy else 'assigned_agent'
            return model.objects.filter(**{filter_key: user})
        return model.objects.none()

    def get_permissions(self):
        """Set action-level permissions. Admins/Managers can change status."""
        if self.action in ['approve', 'settle', 'reject', 'destroy']:
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    # --- Custom Actions with Audit Logging ---
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        claim = self.get_object()
        if claim.status not in [Claim.Status.UNDER_REVIEW, Claim.Status.AWAITING_DOCS]:
            raise exceptions.ValidationError("Claim can only be approved when 'Under Review' or 'Awaiting Docs'.")
        claim.status = Claim.Status.APPROVED
        claim.save(update_fields=['status', 'updated_at'])
        self._log_action("CLAIM_APPROVED", claim)
        return Response(self.get_serializer(claim).data)

    @action(detail=True, methods=['post'], serializer_class=SettleClaimSerializer)
    def settle(self, request, pk=None):
        claim = self.get_object()
        if claim.status != Claim.Status.APPROVED:
            raise exceptions.ValidationError("Claim must be 'Approved' before it can be settled.")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        claim.settled_amount = serializer.validated_data['settled_amount']
        claim.status = Claim.Status.SETTLED
        claim.save(update_fields=['status', 'settled_amount', 'updated_at'])
        self._log_action("CLAIM_SETTLED", claim)
        return Response(ClaimSerializer(claim, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        claim = self.get_object()
        if claim.status in [Claim.Status.SETTLED, Claim.Status.CLOSED]:
            raise exceptions.ValidationError("Cannot reject a claim that is already settled or closed.")
        claim.status = Claim.Status.REJECTED
        claim.save(update_fields=['status', 'updated_at'])
        self._log_action("CLAIM_REJECTED", claim)
        return Response(self.get_serializer(claim).data)

@extend_schema_view(
    list=extend_schema(summary="List Documents for a Claim"),
    create=extend_schema(summary="Upload a Document for a Claim"),
)
class ClaimDocumentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ClaimDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    
    def get_queryset(self):
        """Filter documents based on the claim_pk from the nested URL."""
        return ClaimDocument.objects.select_related('claim', 'uploaded_by').filter(claim_id=self.kwargs['claim_pk'])

    def perform_create(self, serializer):
        """Associate the document with the claim from the URL."""
        claim = get_object_or_4_4(Claim, pk=self.kwargs['claim_pk'])
        # IsObjectInScope on the viewset already checks if the user can access this claim
        serializer.save(uploaded_by=self.request.user, claim=claim)