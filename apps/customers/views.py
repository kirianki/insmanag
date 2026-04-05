# apps/customers/views.py

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import (exceptions, permissions, status, viewsets)
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.accounts.permissions import (IsAgencyAdmin, IsAgent, IsBranchManager,
                                       IsObjectInScope, IsSuperUser)
from apps.auditing.mixins import AuditLogMixin

from .models import Customer, CustomerDocument, Lead, Renewal
# FIX 1: Import the specific permission for Renewals
from .permissions import IsLeadInScope, IsRenewalInScope 
from .serializers import (CustomerDocumentListSerializer, CustomerDocumentSerializer,
                          CustomerSerializer, LeadSerializer, RenewalSerializer)
from .services import KYCService, LeadService


@extend_schema_view(
    list=extend_schema(summary="List All Customer Documents (Admin)", description="Provides a flat list of all customer documents for admin users, filterable by status."),
    retrieve=extend_schema(summary="Retrieve a Customer Document (Admin)", description="Retrieve a single customer document by its ID."),
    verify=extend_schema(summary="Verify a Customer Document (Admin)", description="Sets the status of a specific document to VERIFIED.", responses={200: CustomerDocumentListSerializer}),
    reject=extend_schema(summary="Reject a Customer Document (Admin)", description="Sets the status of a specific document to REJECTED.", responses={200: CustomerDocumentListSerializer})
)
class AllCustomerDocumentsViewSet(viewsets.ModelViewSet):
    """
    Provides a system-wide view of customer documents for administrators.
    - Superusers can see all documents.
    - Agency Admins can see documents for all customers in their agency.
    - Branch Managers can see documents for all customers in their branch.
    - Supports actions to verify or reject documents directly.
    """
    # Allow 'get' for listing/retrieving, 'post' for our custom actions, and 'delete' for removal
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    
    serializer_class = CustomerDocumentListSerializer
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin | IsBranchManager)]
    filter_backends = [filters.DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['verification_status']
    search_fields = ['customer__first_name', 'customer__last_name', 'customer__phone', 'customer__email', 'customer__customer_number']
    ordering_fields = ['created_at', 'customer__first_name', 'customer__last_name', 'expiry_date']
    ordering = ['customer__first_name', 'customer__last_name', '-created_at']

    def get_queryset(self):
        user = self.request.user
        qs = CustomerDocument.objects.select_related('customer', 'verified_by', 'customer__agency', 'customer__branch')

        if user.is_superuser:
            return qs.all()
        if user.is_agency_admin:
            return qs.filter(customer__agency=user.agency)
        if user.is_branch_manager:
            return qs.filter(customer__branch=user.branch)

        return CustomerDocument.objects.none()
    
    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """
        Custom action to verify a customer document.
        """
        document = self.get_object()
        KYCService.verify_document(document=document, verified_by=request.user)
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        Custom action to reject a customer document.
        """
        document = self.get_object()
        KYCService.reject_document(document=document, rejected_by=request.user)
        return Response(self.get_serializer(document).data)


class CustomerViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing Customers.
    Enables filtering by assigned agent and KYC status, and
    provides a search functionality across name, email, and phone number.
    """
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]
    filter_backends = [filters.DjangoFilterBackend, SearchFilter]
    filterset_fields = ['assigned_agent__id', 'kyc_status']
    search_fields = ['first_name', 'last_name', 'email', 'phone']

    def get_queryset(self):
        """
        Dynamically filters the queryset based on the user's role.
        """
        user = self.request.user
        qs = Customer.objects.select_related('assigned_agent', 'agency', 'branch', 'kyc_verified_by')
        if user.is_superuser:
            return qs.all()
        if user.is_agency_admin:
            return qs.filter(agency=user.agency)
        if user.is_branch_manager:
            return qs.filter(branch=user.branch)
        if user.is_agent:
            return qs.filter(assigned_agent=user)
        return Customer.objects.none()

    def get_permissions(self):
        """
        Set custom permissions for specific actions.
        """
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """
        Automatically assign agent, agency, and branch on customer creation.
        """
        user = self.request.user
        super().perform_create(serializer, assigned_agent=user, agency=user.agency, branch=user.branch)


class CustomerDocumentViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing customer documents, nested under a specific customer.
    """
    serializer_class = CustomerDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsObjectInScope]

    def get_queryset(self):
        """
        Return documents belonging to the customer specified in the URL.
        """
        return CustomerDocument.objects.select_related('customer', 'verified_by').filter(customer_id=self.kwargs['customer_pk'])

    def get_permissions(self):
        """
        Restrict document verification, rejection, and deletion to managers and admins.
        """
        if self.action in ['verify', 'reject', 'destroy']:
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin | IsBranchManager)()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """
        Associate the document with the customer from the URL.
        """
        customer = get_object_or_404(Customer, pk=self.kwargs['customer_pk'])
        super().perform_create(serializer, customer=customer)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None, **kwargs):
        """
        Custom action to verify a customer document.
        Optionally accepts 'notes'.
        """
        document = self.get_object()
        notes = request.data.get('notes')
        KYCService.verify_document(document=document, verified_by=request.user, notes=notes)
        self._log_action("CUSTOMER_DOCUMENT_VERIFIED", document)
        return Response(self.get_serializer(document).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None, **kwargs):
        """
        Custom action to reject a customer document.
        Requires 'notes' or 'rejection_reason' in the body.
        """
        document = self.get_object()
        reason = request.data.get('notes') or request.data.get('rejection_reason')
        
        if not reason:
            raise exceptions.ValidationError({"detail": "Rejection reason is required."})
            
        KYCService.reject_document(document=document, rejected_by=request.user, rejection_reason=reason)
        self._log_action("CUSTOMER_DOCUMENT_REJECTED", document)
        return Response(self.get_serializer(document).data)


class LeadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing leads.
    """
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated, IsLeadInScope]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['status', 'source', 'assigned_agent__id']

    def get_queryset(self):
        """
        Dynamically filters the queryset based on the user's role.
        """
        user = self.request.user
        qs = Lead.objects.select_related('assigned_agent', 'agency', 'converted_customer')
        if user.is_superuser:
            return qs.all()
        if user.is_agency_admin:
            return qs.filter(agency=user.agency)
        if user.is_branch_manager:
            return qs.filter(assigned_agent__branch=user.branch)
        if user.is_agent:
            return qs.filter(assigned_agent=user)
        return Lead.objects.none()

    def perform_create(self, serializer):
        """
        Automatically assign agent and agency on lead creation.
        """
        user = self.request.user
        super().perform_create(serializer, assigned_agent=user, agency=user.agency)

    @action(detail=True, methods=['post'], url_path='convert')
    def convert(self, request, pk=None):
        """
        Custom action to convert a lead into a customer.
        """
        lead = self.get_object()
        try:
            customer = LeadService.convert_lead_to_customer(lead)
            self._log_action("LEAD_CONVERTED", lead, details={"customer_id": str(customer.id), "customer_name": str(customer)})
        except ValueError as e:
            raise exceptions.ValidationError({"detail": str(e)})
        return Response(CustomerSerializer(customer).data, status=status.HTTP_201_CREATED)


class RenewalFilter(filters.FilterSet):
    """
    Custom filter for Renewals to allow searching by customer name.
    """
    customer_name = filters.CharFilter(method='filter_by_customer_name', label="Customer Name")

    class Meta:
        model = Renewal
        fields = ['customer', 'created_by']

    def filter_by_customer_name(self, queryset, name, value):
        """
        Filters renewals based on the customer's first or last name.
        """
        if not value:
            return queryset
        return queryset.filter(
            Q(customer__first_name__icontains=value) | Q(customer__last_name__icontains=value)
        )


class RenewalViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing customer renewals.
    """
    serializer_class = RenewalSerializer
    # FIX 2: Use IsRenewalInScope to properly check permissions on the related customer
    permission_classes = [permissions.IsAuthenticated, IsRenewalInScope]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = RenewalFilter

    def get_permissions(self):
        """
        Set custom permissions for specific actions.
        - Anyone authenticated can update a renewal if they have object scope.
        - Only SuperUsers and AgencyAdmins can delete a renewal.
        """
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), (IsSuperUser | IsAgencyAdmin)()]
        return super().get_permissions()

    def get_queryset(self):
        """
        Dynamically filters the queryset based on the user's role.
        """
        user = self.request.user
        qs = Renewal.objects.select_related('customer', 'created_by', 'customer__agency', 'customer__branch')
        if user.is_superuser:
            return qs.all()
        if user.is_agency_admin:
            return qs.filter(customer__agency=user.agency)
        if user.is_branch_manager:
            return qs.filter(customer__branch=user.branch)
        if user.is_agent:
            return qs.filter(Q(created_by=user) | Q(customer__assigned_agent=user)).distinct()
        return Renewal.objects.none()

    def get_serializer_context(self):
        """
        Provide a filtered queryset of customers to the serializer for creation.
        """
        context = super().get_serializer_context()
        
        # FIX 3: Check for 'update' and 'partial_update' actions to prevent validation errors
        if self.action in ['create', 'update', 'partial_update']:
            user = self.request.user
            customer_qs = Customer.objects.none()
            if user.is_superuser:
                customer_qs = Customer.objects.all()
            elif user.is_agency_admin:
                customer_qs = Customer.objects.filter(agency=user.agency)
            elif user.is_branch_manager:
                customer_qs = Customer.objects.filter(branch=user.branch)
            elif user.is_agent:
                customer_qs = Customer.objects.filter(assigned_agent=user)
            context['customers_queryset'] = customer_qs
        return context

    def perform_create(self, serializer):
        """
        Automatically assign the creator of the renewal.
        """
        super().perform_create(serializer, created_by=self.request.user)