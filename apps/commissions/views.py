# apps/commissions/views.py
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, exceptions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from django_filters.rest_framework import DjangoFilterBackend

from apps.auditing.mixins import AuditLogMixin
from apps.accounts.permissions import IsAgencyAdmin, IsBranchManager, IsObjectInScope, IsSuperUser
from .models import CustomerPayment, ProviderCommissionStructure, StaffCommissionRule, PayoutBatch, StaffCommission
from .serializers import (CustomerPaymentSerializer, ProviderCommissionStructureSerializer, 
                          StaffCommissionRuleSerializer, PayoutBatchSerializer, StaffCommissionSerializer)
from .services import PayoutService, CommissionService

class CustomerPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['policy', 'customer']
    
    def get_queryset(self):
        user = self.request.user
        qs = CustomerPayment.objects.select_related('customer', 'policy', 'policy__agency', 'policy__branch')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(policy__agency=user.agency)
        if user.is_branch_manager: return qs.filter(policy__branch=user.branch)
        return qs.filter(policy__agent=user)

class ProviderCommissionStructureViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ProviderCommissionStructureSerializer
    # --- CORRECTED: Added () to instantiate the combined permission class ---
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin)]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['provider', 'policy_type', 'commission_type']
    
    def get_queryset(self):
        return ProviderCommissionStructure.objects.filter(agency=self.request.user.agency)
    
    def perform_create(self, serializer):
        serializer.save(agency=self.request.user.agency)

class StaffCommissionRuleViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = StaffCommissionRuleSerializer
    # --- CORRECTED: Added () to instantiate the combined permission class ---
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin)]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'policy_type', 'payout_basis']
    
    def get_queryset(self):
        return StaffCommissionRule.objects.filter(agency=self.request.user.agency)

    def perform_create(self, serializer):
        serializer.save(agency=self.request.user.agency)

class StaffCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StaffCommissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['agent', 'policy', 'status', 'payout_batch', 'commission_type']
    
    def get_queryset(self):
        user = self.request.user
        qs = StaffCommission.objects.select_related('agent', 'policy', 'payout_batch', 'agency', 'branch', 'installment')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(agency=user.agency)
        if user.is_branch_manager: return qs.filter(branch=user.branch)
        return qs.filter(agent=user)

    def get_permissions(self):
        if self.action == 'approve':
            # --- CORRECTED: Wrapped the entire expression in () to instantiate it ---
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        commission = self.get_object()
        try:
            CommissionService.approve_commission(commission, request.user)
        except ValueError as e:
            raise exceptions.ValidationError({"detail": str(e)})
        return Response(self.get_serializer(commission).data)

@extend_schema_view(create=extend_schema(summary="Create & Initiate a Payout Batch"))
class PayoutBatchViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutBatchSerializer
    # --- CORRECTED: Added () to instantiate the combined permission class ---
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin)]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']

    def get_queryset(self):
        return PayoutBatch.objects.filter(agency=self.request.user.agency)

    def create(self, request, *args, **kwargs):
        try:
            batch = PayoutService.create_payout_batch(agency=request.user.agency, initiated_by=request.user)
            return Response(self.get_serializer(batch).data, status=status.HTTP_201_CREATED)
        except PayoutService.PayoutError as e:
            raise exceptions.ValidationError({"detail": str(e)})