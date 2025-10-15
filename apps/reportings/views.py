# apps/reports/views.py

import csv
from datetime import datetime
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, exceptions, status
from drf_spectacular.utils import extend_schema, OpenApiParameter

# Using the more robust, role-based permissions from the accounts app
from apps.accounts.permissions import IsSuperUser, IsAgencyAdmin, IsBranchManager

from .services import ReportingService
from apps.policies.models import Policy
from apps.commissions.models import StaffCommission
from apps.customers.models import Lead, Customer
from apps.claims.models import Claim

def apply_date_filters(queryset, date_from_str, date_to_str, date_field='created_at'):
    """Helper to apply date range filtering to a queryset."""
    filters = {}
    if date_from_str:
        try:
            filters[f"{date_field}__date__gte"] = datetime.strptime(date_from_str, "%Y-%m-%d").date()
        except ValueError:
            raise exceptions.ValidationError({"date_from": "Invalid date format. Use YYYY-MM-DD."})
    if date_to_str:
        try:
            filters[f"{date_field}__date__lte"] = datetime.strptime(date_to_str, "%Y-%m-%d").date()
        except ValueError:
            raise exceptions.ValidationError({"date_to": "Invalid date format. Use YYYY-MM-DD."})
    return queryset.filter(**filters)

class ReportGeneratorView(APIView):
    """
    A single, powerful endpoint for generating various business reports.
    Data is automatically scoped to the user's role (Branch Manager or Agency Admin).
    Supports JSON output for UIs and CSV for downloads.
    """
    # A user can access this view if they are a SuperUser OR an AgencyAdmin OR a BranchManager.
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin | IsBranchManager)]

    REPORT_TYPES = {
        # Summary Reports
        'sales-summary': {'func': ReportingService.generate_sales_summary_by_agent, 'model': Policy, 'scope_field': 'agent'},
        'commissions-summary': {'func': ReportingService.generate_commissions_summary_by_agent, 'model': StaffCommission, 'scope_field': 'agent'},
        'leads-summary': {'func': ReportingService.generate_lead_performance_summary_by_agent, 'model': Lead, 'scope_field': 'assigned_agent'},
        
        # Detail Reports
        'policies-detail': {'func': ReportingService.generate_policies_detail_report, 'model': Policy, 'scope_field': 'agent'},
        'customers-detail': {'func': ReportingService.generate_customers_detail_report, 'model': Customer, 'scope_field': 'assigned_agent'},
        'claims-detail': {'func': ReportingService.generate_claims_detail_report, 'model': Claim, 'scope_field': 'policy__agent'},
    }

    @extend_schema(
        summary="Generate a Scoped Business Report",
        description="Generates summary or detail reports. The data is automatically scoped based on the user's role (Branch or Agency). Supports JSON and CSV formats.",
        parameters=[
            OpenApiParameter(name='report_type', location='path', description="Type of report to generate. Available: " + ", ".join(REPORT_TYPES.keys()), required=True, type=str),
            OpenApiParameter(name='date_from', description='Start date for filtering (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='date_to', description='End date for filtering (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='format', description="Output format. Either 'json' (default) or 'csv'.", required=False, type=str),
            OpenApiParameter(name='status', description="Filter by status (for policies-detail, claims-detail).", required=False, type=str),
            OpenApiParameter(name='kyc_status', description="Filter by kyc_status (for customers-detail).", required=False, type=str),
            OpenApiParameter(name='agent_id', description="Filter by agent UUID (for detail reports).", required=False, type=str),
        ]
    )
    def get(self, request, report_type, *args, **kwargs):
        if report_type not in self.REPORT_TYPES:
            raise exceptions.NotFound(f"Report type '{report_type}' not found.")

        user = request.user
        report_config = self.REPORT_TYPES[report_type]
        service_func = report_config['func']
        base_model = report_config['model']
        scope_field = report_config['scope_field']
        
        # --- 1. Determine base queryset based on user's role ---
        if user.is_branch_manager and user.branch:
            scope_filter = {f"{scope_field}__branch": user.branch}
            qs = base_model.objects.filter(**scope_filter)
        elif user.is_agency_admin and user.agency:
            if base_model in [Customer, Lead]:
                 scope_filter = {'agency': user.agency}
            else:
                 scope_filter = {f"{scope_field}__agency": user.agency}
            qs = base_model.objects.filter(**scope_filter)
        elif user.is_superuser:
            qs = base_model.objects.all()
        else:
            return Response({"detail": "You do not have the required scope to view this report."}, status=status.HTTP_403_FORBIDDEN)
            
        # --- 2. Apply common filters ---
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        qs = apply_date_filters(qs, date_from, date_to)

        # --- 3. Pass all other query params as specific filters to the service ---
        other_filters = {k: v for k, v in request.query_params.items() if k not in ['date_from', 'date_to', 'format']}
        report_data = service_func(qs, **other_filters)

        # --- 4. Format and return response ---
        output_format = request.query_params.get("format", "json")
        if output_format == 'csv':
            return self.get_csv_response(report_data, report_type)
        else:
            return Response(report_data)

    def get_csv_response(self, data, report_name):
        if not data:
            return HttpResponse("No data available for this report.", content_type="text/plain", status=200)

        response = HttpResponse(content_type='text/csv')
        filename = f"{report_name}_report_{datetime.now().strftime('%Y-%m-%d')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        # Write header row from the keys of the first dictionary
        writer.writerow(data[0].keys())
        # Write data rows
        for row in data:
            writer.writerow(row.values())

        return response