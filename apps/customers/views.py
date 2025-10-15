# apps/customers/views.py
from django.db.models import Q
from django.shortcuts import get_object_or_404
# --- THIS IS THE LINE TO BE MODIFIED ---
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import (exceptions, permissions, status, viewsets)
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import (IsAgencyAdmin, IsAgent, IsBranchManager,
                                       IsObjectInScope, IsSuperUser)
from apps.auditing.mixins import AuditLogMixin

from .models import Customer, CustomerDocument, Lead, Renewal
from .permissions import IsLeadInScope
from .serializers import (CustomerDocumentSerializer, CustomerSerializer,
                          LeadSerializer, RenewalSerializer)
from .services import KYCService, LeadService


# ... (CustomerViewSet, CustomerDocumentViewSet, and LeadViewSet remain unchanged) ...


@extend_schema_view(
    list=extend_schema(summary="List Customers (Scoped by Role)"),
    create=extend_schema(summary="Create a new Customer"),
    retrieve=extend_schema(summary="Get Customer Details"),
    update=extend_schema(summary="Update Customer Details"),
    destroy=extend_schema(summary="Delete a Customer (Manager/Admin only)")
)
class CustomerViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Manages customers. Access is scoped based on the user's role and relationship
    to the customer (e.g., as the assigned agent).
    """
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['assigned_agent__id', 'kyc_status']

    def get_queryset(self):
        user = self.request.user
        qs = Customer.objects.select_related('assigned_agent', 'agency', 'branch', 'kyc_verified_by')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(agency=user.agency)
        if user.is_branch_manager: return qs.filter(branch=user.branch)
        if user.is_agent: return qs.filter(assigned_agent=user)
        return Customer.objects.none()

    def get_permissions(self):
        if self.action == 'create': return [permissions.IsAuthenticated()]
        if self.action == 'destroy': return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(assigned_agent=user, agency=user.agency, branch=user.branch)

@extend_schema_view(
    list=extend_schema(summary="List a Customer's Documents"),
    create=extend_schema(summary="Upload a Customer Document"),
    retrieve=extend_schema(summary="Get Document Details"),
    verify=extend_schema(summary="Verify a Customer Document (Admin/Manager only)"),
    reject=extend_schema(summary="Reject a Customer Document (Admin/Manager only)")
)
class CustomerDocumentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Manages documents for a specific customer, accessed via a nested URL.
    """
    serializer_class = CustomerDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        return CustomerDocument.objects.select_related(
            'customer', 'verified_by'
        ).filter(customer_id=self.kwargs['customer_pk'])

    def get_permissions(self):
        if self.action in ['verify', 'reject', 'destroy']:
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    def perform_create(self, serializer):
        customer = get_object_or_404(Customer, pk=self.kwargs['customer_pk'])
        serializer.save(customer=customer)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None, **kwargs):
        document = self.get_object()
        KYCService.verify_document(document=document, verified_by=request.user)
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None, **kwargs):
        document = self.get_object()
        KYCService.reject_document(document=document, rejected_by=request.user)
        return Response(self.get_serializer(document).data)

@extend_schema_view(
    list=extend_schema(summary="List Leads (Scoped by Role)"),
    create=extend_schema(summary="Create a new Lead"),
    convert=extend_schema(summary="Convert a Lead into a Customer", responses={201: CustomerSerializer})
)
class LeadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Manages leads, including their conversion to customers.
    """
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated, IsLeadInScope]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['status', 'source', 'assigned_agent__id']

    def get_queryset(self):
        user = self.request.user
        qs = Lead.objects.select_related('assigned_agent', 'agency', 'converted_customer')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(agency=user.agency)
        if user.is_branch_manager: return qs.filter(assigned_agent__branch=user.branch)
        if user.is_agent: return qs.filter(assigned_agent=user)
        return Lead.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(assigned_agent=user, agency=user.agency)

    @action(detail=True, methods=['post'], url_path='convert')
    def convert(self, request, pk=None):
        lead = self.get_object()
        try:
            customer = LeadService.convert_lead_to_customer(lead)
        except ValueError as e:
            raise exceptions.ValidationError({"detail": str(e)})
        return Response(CustomerSerializer(customer).data, status=status.HTTP_201_CREATED)


# --- THIS IS THE NEW FILTER CLASS DEFINED IN THE SAME FILE ---
class RenewalFilter(filters.FilterSet):
    """Custom filterset for Renewals to allow searching by customer name."""
    customer_name = filters.CharFilter(method='filter_by_customer_name', label="Customer Name")

    class Meta:
        model = Renewal
        # Allows filtering by exact ID for 'customer' and 'created_by'
        fields = ['customer', 'created_by']

    def filter_by_customer_name(self, queryset, name, value):
        """Custom method to filter across the customer's first and last names."""
        if not value:
            return queryset
        return queryset.filter(
            Q(customer__first_name__icontains=value) |
            Q(customer__last_name__icontains=value)
        )


@extend_schema_view(
    list=extend_schema(summary="List Renewals (Scoped by Role)"),
    create=extend_schema(summary="Create a new Renewal"),
)
class RenewalViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Manages policy renewals for customers.
    """
    serializer_class = RenewalSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    # --- THESE LINES ARE MODIFIED ---
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = RenewalFilter # Use our new custom filter class

    def get_queryset(self):
        user = self.request.user
        qs = Renewal.objects.select_related('customer', 'created_by', 'customer__agency', 'customer__branch')
        if user.is_superuser: return qs.all()
        if user.is_agency_admin: return qs.filter(customer__agency=user.agency)
        if user.is_branch_manager: return qs.filter(customer__branch=user.branch)
        if user.is_agent: return qs.filter(Q(created_by=user) | Q(customer__assigned_agent=user)).distinct()
        return Renewal.objects.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == 'create':
            user = self.request.user
            customer_qs = Customer.objects.none()
            if user.is_superuser: customer_qs = Customer.objects.all()
            if user.is_agency_admin: customer_qs = Customer.objects.filter(agency=user.agency)
            if user.is_branch_manager: customer_qs = Customer.objects.filter(branch=user.branch)
            if user.is_agent: customer_qs = Customer.objects.filter(assigned_agent=user)
            context['customers_queryset'] = customer_qs
        return context

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)