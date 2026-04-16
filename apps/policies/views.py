from django.db.models import Count, Sum, Q, F, Value, CharField, Subquery, OuterRef, DecimalField
from django.db.models.functions import Cast, Coalesce
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import (exceptions, permissions, status, viewsets)
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, BooleanFilter
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import Agency, User
from apps.core.pagination import LargeResultsSetPagination
from apps.customers.models import Customer
from apps.accounts.permissions import (IsAgencyAdmin, IsAgent, IsBranchManager, IsObjectInScope, IsSuperUser)
from apps.auditing.mixins import AuditLogMixin
from apps.commissions.models import CustomerPayment
from .models import InsuranceProvider, Policy, PolicyType, PolicyInstallment
from .serializers import (InsuranceProviderListSerializer, InsuranceProviderSerializer, PolicyActivationSerializer,
                          PolicyListSerializer, PolicySerializer, PolicyTypeSerializer,
                          PolicyInstallmentSerializer, InstallmentPaymentSerializer,
                          UnpaidItemSerializer, SimulatePaymentSerializer, PolicyStatusUpdateSerializer,
                          RecurringPaymentSerializer)
from .services import PolicyService, CommissionGenerationError, PaymentSimulationService


class PolicyFilter(FilterSet):
    start_date = DateFilter(field_name='policy_start_date', lookup_expr='gte', label='Policy Start Date (from)')
    end_date = DateFilter(field_name='policy_start_date', lookup_expr='lte', label='Policy Start Date (to)')
    has_vehicle_registration = BooleanFilter(method='filter_has_vehicle_registration')

    class Meta:
        model = Policy
        fields = [
            'status', 'customer', 'agent', 'provider', 'policy_type',
            'is_installment', 'vehicle_registration_number'
        ]

    def filter_has_vehicle_registration(self, queryset, name, value):
        if value:
            return queryset.filter(vehicle_registration_number__isnull=False).exclude(vehicle_registration_number__exact='')
        return queryset


@extend_schema_view(
    list=extend_schema(summary="List Insurance Providers"),
    create=extend_schema(summary="Create an Insurance Provider (Admins only)"),
)
class InsuranceProviderViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'country', 'city']
    search_fields = ['name', 'short_name', 'email']
    ordering = ['name']
    pagination_class = LargeResultsSetPagination

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
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'payment_structure', 'requires_vehicle_reg']
    search_fields = ['name']
    ordering = ['name']
    pagination_class = LargeResultsSetPagination

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
        super().perform_create(serializer, agency=agency)


@extend_schema_view(
    list=extend_schema(summary="List Policies (Scoped by Role)"),
    create=extend_schema(summary="Create a Policy"),
    retrieve=extend_schema(summary="Get Policy Details"),
    update=extend_schema(summary="Update a Policy"),
    destroy=extend_schema(summary="Delete a Policy (Admin/Manager only)"),
)
class PolicyViewSet(AuditLogMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PolicyFilter
    search_fields = ['policy_number', 'customer__first_name', 'customer__last_name', 'vehicle_registration_number']
    ordering = ['-created_at']
    pagination_class = LargeResultsSetPagination

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

    def get_serializer_context(self):
        context = super().get_serializer_context(); user = self.request.user
        if self.action in ['create', 'update', 'partial_update']:
            context['customers_qs'] = self._get_scoped_customer_queryset(user)
            context['agents_qs'] = self._get_scoped_agent_queryset(user)
            context['policy_types_qs'] = self._get_scoped_policy_type_queryset(user)
        return context

    def get_permissions(self):
        if self.action == 'create': return [permissions.IsAuthenticated()]
        if self.action == 'destroy': return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        if self.action == 'update_status':
            return [permissions.IsAuthenticated(), (IsAgencyAdmin | IsBranchManager)(), IsObjectInScope()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if 'agent' in serializer.validated_data:
            super().perform_create(serializer)
        else:
            super().perform_create(serializer, agent=self.request.user)

    def _get_scoped_customer_queryset(self, user):
        if user.is_superuser: return Customer.objects.all()
        if user.is_agency_admin: return Customer.objects.filter(agency=user.agency)
        if user.is_branch_manager: return Customer.objects.filter(branch=user.branch)
        if user.is_agent: return Customer.objects.filter(assigned_agent=user)
        return Customer.objects.none()

    def _get_scoped_agent_queryset(self, user):
        assignable_roles = ['Agent', 'Branch Manager', 'Agency Admin']
        if user.is_superuser: return User.objects.filter(groups__name__in=assignable_roles)
        if user.is_agency_admin: return User.objects.filter(agency=user.agency, groups__name__in=assignable_roles)
        if user.is_branch_manager: return User.objects.filter(branch=user.branch, groups__name__in=assignable_roles)
        return User.objects.filter(pk=user.pk)

    def _get_scoped_policy_type_queryset(self, user):
        if user.is_superuser: return PolicyType.objects.filter(is_active=True)
        if user.agency: return PolicyType.objects.filter(agency=user.agency, is_active=True)
        return PolicyType.objects.none()

    @extend_schema(request=PolicyActivationSerializer, responses={200: PolicySerializer}, summary="Activate any Policy (Full or Installment)")
    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        policy = self.get_object()
        serializer = PolicyActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            PolicyService.activate_policy(policy=policy, **serializer.validated_data)
        except (ValueError, CommissionGenerationError) as e:
            raise exceptions.ValidationError({"detail": str(e)})
        policy.refresh_from_db()
        return Response(PolicySerializer(policy, context=self.get_serializer_context()).data)
    
    @extend_schema(request=PolicyStatusUpdateSerializer, responses={200: PolicySerializer}, summary="Update a Policy's Status (e.g., Cancel, Lapse)")
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        policy = self.get_object()
        serializer = PolicyStatusUpdateSerializer(instance=policy, data=request.data)
        serializer.is_valid(raise_exception=True)
        policy.status = serializer.validated_data['status']
        policy.save(update_fields=['status', 'updated_at'])
        return Response(PolicySerializer(policy, context=self.get_serializer_context()).data)
    
    @extend_schema(request=RecurringPaymentSerializer, responses={200: PolicySerializer}, summary="Record a Payment for a Recurring OR Premium-Based Policy")
    @action(detail=True, methods=['post'], url_path='record-recurring-payment')
    def record_recurring_payment(self, request, pk=None):
        policy = self.get_object()
        serializer = RecurringPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        try:
            if policy.policy_type.payment_structure == PolicyType.PaymentStructure.RECURRING_FEE:
                PolicyService.record_recurring_payment(policy=policy, **validated_data)
            elif not policy.is_installment:
                PolicyService.record_payment_for_policy(policy=policy, **validated_data)
            else:
                raise ValueError("This endpoint is not for installment-based policies. Please use the pay installment endpoint.")

        except ValueError as e:
            raise exceptions.ValidationError({"detail": str(e)})
        
        policy.refresh_from_db()
        return Response(PolicySerializer(policy, context=self.get_serializer_context()).data)

    @extend_schema(summary="Get Policy Statistics (Scoped by Role)")
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        queryset = self.get_queryset()
        stats = queryset.aggregate(
            total_policies=Count('id'),
            active_policies=Count('id', filter=Q(status=Policy.Status.ACTIVE)),
            active_installment_policies=Count('id', filter=Q(status=Policy.Status.ACTIVE_INSTALLMENT)),
            pending_activation=Count('id', filter=Q(status=Policy.Status.PAID_PENDING_ACTIVATION)),
            expired_policies=Count('id', filter=Q(status=Policy.Status.EXPIRED)),
            total_premium_value=Sum('premium_amount')
        )
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
    
    @extend_schema(request=InstallmentPaymentSerializer, responses={200: PolicyInstallmentSerializer}, summary="Record a Payment for an Installment")
    @action(detail=True, methods=['post'])
    def pay(self, request, policy_pk=None, pk=None):
        installment = self.get_object()
        serializer = InstallmentPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            PolicyService.record_installment_payment(installment=installment, **serializer.validated_data)
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
        base_policy_qs = Policy.objects.select_related('customer').all()
        base_installment_qs = PolicyInstallment.objects.select_related('policy__customer').all()

        if user.is_agency_admin:
            base_policy_qs = base_policy_qs.filter(agency=user.agency)
            base_installment_qs = base_installment_qs.filter(policy__agency=user.agency)
        elif user.is_branch_manager:
            base_policy_qs = base_policy_qs.filter(branch=user.branch)
            base_installment_qs = base_installment_qs.filter(policy__branch=user.branch)
        elif user.is_agent:
            base_policy_qs = base_policy_qs.filter(agent=user)
            base_installment_qs = base_installment_qs.filter(policy__agent=user)
        elif not user.is_superuser:
            return Policy.objects.none()

        payments_subquery = CustomerPayment.objects.filter(policy=OuterRef('pk')).values('policy').annotate(total_paid=Sum('amount')).values('total_paid')
        policy_qs = base_policy_qs.annotate(amount_paid=Coalesce(Subquery(payments_subquery), 0, output_field=DecimalField()))
        unpaid_policies_qs = policy_qs.filter(is_installment=False, status__in=[Policy.Status.AWAITING_PAYMENT, Policy.Status.PARTIALLY_PAID])
        
        unpaid_policies = unpaid_policies_qs.annotate(
            item_id=Cast('id', output_field=CharField()),
            item_type=Value('POLICY', output_field=CharField()),
            due_date=F('created_at__date'),
            amount_due=F('premium_amount') - F('amount_paid'),
            customer_name=F('customer__first_name')
        ).values('item_id', 'item_type', 'due_date', 'amount_due', 'policy_number', 'customer_name')

        unpaid_installments = base_installment_qs.filter(status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE]).annotate(
            item_id=Cast('id', output_field=CharField()),
            item_type=Value('INSTALLMENT', output_field=CharField()),
            amount_due=F('amount'),
            policy_number=F('policy__policy_number'),
            customer_name=F('policy__customer__first_name')
        ).values('item_id', 'item_type', 'due_date', 'amount_due', 'policy_number', 'customer_name')

        return unpaid_policies.union(unpaid_installments)
    
    @extend_schema(request=SimulatePaymentSerializer, responses={200: {"description": "Payment simulation was successful."}}, summary="Simulate a Payment for any Unpaid Item")
    @action(detail=False, methods=['post'], url_path='simulate-payment')
    def simulate_payment(self, request, *args, **kwargs):
        serializer = SimulatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        try:
            response_data = PaymentSimulationService.simulate_payment(
                item_type=validated_data['item_type'],
                item_id=validated_data['item_id'],
                user=request.user,
                amount=validated_data.get('amount')
            )
            return Response(response_data, status=status.HTTP_200_OK)
        except (exceptions.NotFound, exceptions.PermissionDenied, exceptions.ValidationError, ValueError) as e:
            raise exceptions.ValidationError({"detail": str(e)})