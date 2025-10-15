# apps/policies/views.py
from django.db.models import Count, Sum, Q, F, Value, CharField
from django.db.models.functions import Cast
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import (exceptions, permissions, status, viewsets)
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
# --- NEW: Added required imports for filtering ---
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import Agency, User
from apps.customers.models import Customer
from apps.accounts.permissions import (IsAgencyAdmin, IsAgent, IsBranchManager, IsObjectInScope, IsSuperUser)
from apps.auditing.mixins import AuditLogMixin
from .models import InsuranceProvider, Policy, PolicyType, PolicyInstallment
from .serializers import (InsuranceProviderListSerializer, InsuranceProviderSerializer, PolicyActivationSerializer,
                          PolicyListSerializer, PolicySerializer, PolicyTypeSerializer,
                          PolicyInstallmentSerializer, InstallmentPaymentSerializer,
                          UnpaidItemSerializer, SimulatePaymentSerializer)
from .services import PolicyService, CommissionGenerationError, PaymentSimulationService


@extend_schema_view(
    list=extend_schema(summary="List Insurance Providers"),
    create=extend_schema(summary="Create an Insurance Provider (Admins only)"),
)
class InsuranceProviderViewSet(AuditLogMixin, viewsets.ModelViewSet):
    # --- CORRECTED: Cleaned up class attributes ---
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'country', 'city']
    search_fields = ['name', 'short_name', 'email']
    ordering = ['name']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_agency_admin: return InsuranceProvider.objects.all()
        return InsuranceProvider.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        return InsuranceProviderListSerializer if self.action == 'list' else InsuranceProviderSerializer
    
    def get_permissions(self):
        if self.action not in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin)()]
        return super().get_permissions()

@extend_schema_view(
    list=extend_schema(summary="List Policy Types for an Agency"),
    create=extend_schema(summary="Create a Policy Type (Admin only)"),
)
class PolicyTypeViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = PolicyTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PolicyType.objects.filter(agency_id=self.kwargs['agency_pk'])
    
    def get_permissions(self):
        if self.action not in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin)()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        agency = get_object_or_404(Agency, pk=self.kwargs['agency_pk'])
        user = self.request.user
        if user.is_agency_admin and user.agency != agency:
            raise permissions.PermissionDenied("You can only add policy types to your own agency.")
        serializer.save(agency=agency)

@extend_schema_view(
    list=extend_schema(summary="List Policies (Scoped by Role)"),
    create=extend_schema(summary="Create a Policy"),
    retrieve=extend_schema(summary="Get Policy Details"),
    update=extend_schema(summary="Update a Policy"),
    destroy=extend_schema(summary="Delete a Policy (Admin/Manager only)"),
)
class PolicyViewSet(AuditLogMixin, viewsets.ModelViewSet):
    # --- CORRECTED: Cleaned up class attributes ---
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'customer', 'agent', 'provider', 'policy_type', 'is_installment']
    search_fields = ['policy_number', 'customer__first_name', 'customer__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Policy.objects.select_related('customer', 'agent', 'provider', 'policy_type', 'agency', 'branch').prefetch_related('installments')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(agency=user.agency)
        if user.is_branch_manager: return qs.filter(branch=user.branch)
        if user.is_agent: return qs.filter(agent=user)
        return Policy.objects.none()

    def get_serializer_class(self):
        return PolicyListSerializer if self.action == 'list' else PolicySerializer

    # ... (The rest of the PolicyViewSet and other views remain unchanged) ...
    def get_serializer_context(self):
        context = super().get_serializer_context(); user = self.request.user
        if self.action in ['create', 'update', 'partial_update']:
            context['customers_qs'] = self._get_scoped_customer_queryset(user); context['agents_qs'] = self._get_scoped_agent_queryset(user); context['policy_types_qs'] = self._get_scoped_policy_type_queryset(user)
        return context
    def get_permissions(self):
        if self.action == 'create': return [permissions.IsAuthenticated()]
        if self.action == 'destroy': return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()
    def perform_create(self, serializer):
        if self.request.user.is_agent: serializer.save(agent=self.request.user)
        else: serializer.save()
    def _get_scoped_customer_queryset(self, user):
        if user.is_superuser: return Customer.objects.all()
        if user.is_agency_admin: return Customer.objects.filter(agency=user.agency)
        if user.is_branch_manager: return Customer.objects.filter(branch=user.branch)
        if user.is_agent: return Customer.objects.filter(assigned_agent=user)
        return Customer.objects.none()
    def _get_scoped_agent_queryset(self, user):
        agent_roles = ['Agent', 'Branch Manager']
        if user.is_superuser: return User.objects.filter(groups__name__in=agent_roles)
        if user.is_agency_admin: return User.objects.filter(agency=user.agency, groups__name__in=agent_roles)
        if user.is_branch_manager: return User.objects.filter(branch=user.branch, groups__name__in=agent_roles)
        return User.objects.filter(pk=user.pk)
    def _get_scoped_policy_type_queryset(self, user):
        if user.is_superuser: return PolicyType.objects.filter(is_active=True)
        if user.agency: return PolicyType.objects.filter(agency=user.agency, is_active=True)
        return PolicyType.objects.none()

    @extend_schema(
        request=PolicyActivationSerializer, 
        responses={200: PolicySerializer},
        summary="Activate a Policy (Full or Installment)"
    )
    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        policy = self.get_object()
        serializer = PolicyActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            if policy.is_installment:
                PolicyService.activate_installment_policy(
                    policy=policy,
                    certificate_number=serializer.validated_data['insurance_certificate_number'],
                    start_date=serializer.validated_data.get('policy_start_date'),
                    end_date=serializer.validated_data.get('policy_end_date')
                )
            else:
                PolicyService.activate_policy(
                    policy=policy,
                    certificate_number=serializer.validated_data['insurance_certificate_number']
                )
        except (ValueError, CommissionGenerationError) as e:
            raise exceptions.ValidationError({"detail": str(e)})
        
        policy.refresh_from_db()
        return Response(PolicySerializer(policy, context=self.get_serializer_context()).data)
    
    @extend_schema(summary="Get Policy Statistics (Scoped by Role)")
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        queryset = self.get_queryset();
        stats = queryset.aggregate(total_policies=Count('id'), active_policies=Count('id', filter=Q(status=Policy.Status.ACTIVE)), active_installment_policies=Count('id', filter=Q(status=Policy.Status.ACTIVE_INSTALLMENT)), pending_activation=Count('id', filter=Q(status=Policy.Status.PAID_PENDING_ACTIVATION)), expired_policies=Count('id', filter=Q(status=Policy.Status.EXPIRED)), total_premium_value=Sum('total_premium_amount'))
        stats['total_premium_value'] = str(stats['total_premium_value'] or 0)
        return Response(stats)


@extend_schema_view(
    list=extend_schema(summary="List Installments for a Policy"), 
    retrieve=extend_schema(summary="Get Installment Details"),
)
class PolicyInstallmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PolicyInstallmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        policy_viewset = PolicyViewSet()
        policy_viewset.request = self.request
        policy_qs = policy_viewset.get_queryset()
        policy = get_object_or_404(policy_qs, pk=self.kwargs['policy_pk'])
        return policy.installments.all()
    
    @extend_schema(
        request=InstallmentPaymentSerializer, 
        responses={200: PolicyInstallmentSerializer}, 
        summary="Record a Payment for an Installment"
    )
    @action(detail=True, methods=['post'])
    def pay(self, request, policy_pk=None, pk=None):
        installment = self.get_object()
        serializer = InstallmentPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            PolicyService.record_installment_payment(installment, paid_on=serializer.validated_data['paid_on'], transaction_ref=serializer.validated_data.get('transaction_reference', ''))
        except (ValueError, CommissionGenerationError) as e:
            raise exceptions.ValidationError({"detail": str(e)})
        return Response(self.get_serializer(installment).data)


@extend_schema_view(
    list=extend_schema(summary="List All Unpaid Items (Policies & Installments)"),
)
class UnpaidItemsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UnpaidItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        user = self.request.user
        policy_qs = Policy.objects.select_related('customer').all()
        installment_qs = PolicyInstallment.objects.select_related('policy__customer').all()

        if user.is_superuser: pass
        elif user.is_agency_admin:
            policy_qs = policy_qs.filter(agency=user.agency)
            installment_qs = installment_qs.filter(policy__agency=user.agency)
        elif user.is_branch_manager:
            policy_qs = policy_qs.filter(branch=user.branch)
            installment_qs = installment_qs.filter(policy__branch=user.branch)
        elif user.is_agent:
            policy_qs = policy_qs.filter(agent=user)
            installment_qs = installment_qs.filter(policy__agent=user)
        else:
            return Policy.objects.none()

        params = self.request.query_params
        item_type = params.get('item_type')
        if item_type == 'POLICY':
            installment_qs = installment_qs.none()
        elif item_type == 'INSTALLMENT':
            policy_qs = policy_qs.none()

        search_term = params.get('search')
        if search_term:
            policy_search = Q(policy_number__icontains=search_term) | Q(customer__first_name__icontains=search_term)
            installment_search = Q(policy__policy_number__icontains=search_term) | Q(policy__customer__first_name__icontains=search_term)
            policy_qs = policy_qs.filter(policy_search)
            installment_qs = installment_qs.filter(installment_search)

        unpaid_policies = policy_qs.filter(status=Policy.Status.AWAITING_PAYMENT).annotate(
            item_id=Cast('id', output_field=CharField()),
            item_type=Value('POLICY', output_field=CharField()),
            due_date=F('created_at__date'),
            amount_due=F('total_premium_amount'),
            customer_name=F('customer__first_name')
        ).values('item_id', 'item_type', 'due_date', 'amount_due', 'policy_number', 'customer_name')

        unpaid_installments = installment_qs.filter(status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE]).annotate(
            item_id=Cast('id', output_field=CharField()),
            item_type=Value('INSTALLMENT', output_field=CharField()),
            amount_due=F('amount'),
            policy_number=F('policy__policy_number'),
            customer_name=F('policy__customer__first_name')
        ).values('item_id', 'item_type', 'due_date', 'amount_due', 'policy_number', 'customer_name')

        combined_qs = unpaid_policies.union(unpaid_installments)
        ordering = params.get('ordering', 'due_date')
        if ordering in ['due_date', '-due_date', 'policy_number', '-policy_number', 'amount_due', '-amount_due']:
            combined_qs = combined_qs.order_by(ordering)
            
        return combined_qs
    
    @extend_schema(
        request=SimulatePaymentSerializer, 
        responses={200: {"description": "Payment simulation was successful and the item is now marked as paid."}}, 
        summary="Simulate a Payment for any Unpaid Item"
    )
    @action(detail=False, methods=['post'], url_path='simulate-payment')
    def simulate_payment(self, request, *args, **kwargs):
        serializer = SimulatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_type = serializer.validated_data['item_type']
        item_id = serializer.validated_data['item_id']
        try:
            response_data = PaymentSimulationService.simulate_payment(item_type=item_type, item_id=item_id, user=request.user)
            return Response(response_data, status=status.HTTP_200_OK)
        except (exceptions.NotFound, exceptions.PermissionDenied, exceptions.ValidationError) as e:
            raise e