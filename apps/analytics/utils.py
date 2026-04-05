from datetime import datetime
from django.db import models
from rest_framework import exceptions

from apps.policies.models import Policy
from apps.commissions.models import StaffCommission
from apps.customers.models import Lead, Customer, Renewal
from apps.claims.models import Claim

class AnalyticsScopeService:
    """
    A dedicated service to determine the base querysets for analytics
    based on the user's role and scope. This centralizes the core logic
    of "what data can this user see?".
    """
    @staticmethod
    def get_scoped_querysets(user) -> dict:
        """
        Returns a dictionary of base querysets filtered according to the user's role.
        """
        # Superuser sees everything
        if user.is_superuser:
            scope = {"level": "System", "name": "Superuser View", "id": None}
            policies_qs = Policy.objects.all()
            commissions_qs = StaffCommission.objects.all()
            leads_qs = Lead.objects.all()
            claims_qs = Claim.objects.all()
            renewals_qs = Renewal.objects.all()

        # Widen the scope for Agency Admins
        elif user.is_agency_admin and user.agency:
            scope = {"level": "Agency", "name": user.agency.agency_name, "id": str(user.agency.id)}
            policies_qs = Policy.objects.filter(agency=user.agency)
            commissions_qs = StaffCommission.objects.filter(agency=user.agency)
            leads_qs = Lead.objects.filter(agency=user.agency)
            claims_qs = Claim.objects.filter(agency=user.agency)
            renewals_qs = Renewal.objects.filter(customer__agency=user.agency)

        # Widen the scope for Branch Managers
        elif user.is_branch_manager and user.branch:
            scope = {"level": "Branch", "name": user.branch.branch_name, "id": str(user.branch.id)}
            policies_qs = Policy.objects.filter(branch=user.branch)
            commissions_qs = StaffCommission.objects.filter(branch=user.branch)
            leads_qs = Lead.objects.filter(assigned_agent__branch=user.branch)
            claims_qs = Claim.objects.filter(branch=user.branch)
            renewals_qs = Renewal.objects.filter(customer__branch=user.branch)

        # Default to the most restrictive scope: an individual agent
        else:
            scope = {"level": "Agent", "name": user.get_full_name() or user.email, "id": str(user.id)}
            policies_qs = Policy.objects.filter(agent=user)
            commissions_qs = StaffCommission.objects.filter(agent=user)
            leads_qs = Lead.objects.filter(assigned_agent=user)
            claims_qs = Claim.objects.filter(policy__agent=user)
            # Agents see renewals they created OR for customers assigned to them
            renewals_qs = Renewal.objects.filter(
                models.Q(created_by=user) | models.Q(customer__assigned_agent=user)
            ).distinct()

        return {
            "scope": scope,
            "policies": policies_qs,
            "commissions": commissions_qs,
            "leads": leads_qs,
            "claims": claims_qs,
            "renewals": renewals_qs,
        }


def apply_date_filters(queryset, date_from_str, date_to_str, date_field='created_at'):
    """
    Apply inclusive date range filtering to a queryset.
    Automatically handles both DateFields and DateTimeFields by checking the field type.
    """
    filters = {}
    
    if date_from_str or date_to_str:
        # Get the model and field to determine its type
        model = queryset.model
        field = model._meta.get_field(date_field)
        
        # Check if it's a DateTimeField or DateField
        is_datetime_field = isinstance(field, models.DateTimeField)
        
        if date_from_str:
            try:
                date_from = datetime.strptime(date_from_str, "%Y-%m-%d").date()
                # Use __date__gte for DateTimeField, __gte for DateField
                lookup = f"{date_field}__date__gte" if is_datetime_field else f"{date_field}__gte"
                filters[lookup] = date_from
            except ValueError:
                raise exceptions.ValidationError({"date_from": "Invalid date format. Use YYYY-MM-DD."})
        
        if date_to_str:
            try:
                date_to = datetime.strptime(date_to_str, "%Y-%m-%d").date()
                # Use __date__lte for DateTimeField, __lte for DateField
                lookup = f"{date_field}__date__lte" if is_datetime_field else f"{date_field}__lte"
                filters[lookup] = date_to
            except ValueError:
                raise exceptions.ValidationError({"date_to": "Invalid date format. Use YYYY-MM-DD."})
    
    return queryset.filter(**filters) if filters else queryset