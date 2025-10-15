# apps/analytics/utils.py
from datetime import datetime
from rest_framework import exceptions

from apps.policies.models import Policy
from apps.commissions.models import StaffCommission
from apps.customers.models import Lead
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
        # Default to the most restrictive scope: an individual agent
        scope = {"level": "Agent", "name": user.get_full_name() or user.email, "id": str(user.id)}
        policies_qs = Policy.objects.filter(agent=user)
        commissions_qs = StaffCommission.objects.filter(agent=user)
        leads_qs = Lead.objects.filter(assigned_agent=user)
        claims_qs = Claim.objects.filter(policy__agent=user)

        # Widen the scope for managers and admins who have the summary permission
        if user.has_perm('analytics.view_dashboard_summary'):
            if user.is_branch_manager and user.branch:
                scope = {"level": "Branch", "name": user.branch.branch_name, "id": str(user.branch.id)}
                policies_qs = Policy.objects.filter(branch=user.branch)
                commissions_qs = StaffCommission.objects.filter(branch=user.branch)
                leads_qs = Lead.objects.filter(assigned_agent__branch=user.branch)
                claims_qs = Claim.objects.filter(policy__branch=user.branch)
            elif user.is_agency_admin and user.agency:
                scope = {"level": "Agency", "name": user.agency.agency_name, "id": str(user.agency.id)}
                policies_qs = Policy.objects.filter(agency=user.agency)
                commissions_qs = StaffCommission.objects.filter(agency=user.agency)
                leads_qs = Lead.objects.filter(agency=user.agency)
                claims_qs = Claim.objects.filter(policy__agency=user.agency)

        # Superuser sees everything
        if user.is_superuser:
            scope = {"level": "System", "name": "Superuser View", "id": None}
            policies_qs = Policy.objects.all()
            commissions_qs = StaffCommission.objects.all()
            leads_qs = Lead.objects.all()
            claims_qs = Claim.objects.all()

        return {
            "scope": scope,
            "policies": policies_qs,
            "commissions": commissions_qs,
            "leads": leads_qs,
            "claims": claims_qs,
        }

def apply_date_filters(queryset, date_from_str, date_to_str, date_field='created_at'):
    """
    Apply inclusive date range filtering to a queryset.
    Handles both DateFields and DateTimeFields.
    """
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
    return queryset.filter(**filters) if filters else queryset