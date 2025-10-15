# apps/analytics/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, exceptions
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.shortcuts import get_object_or_404

from apps.accounts.models import AgencyBranch, User
from .services import AnalyticsService
from .utils import AnalyticsScopeService, apply_date_filters


class AnalyticsDashboardView(APIView):
    """
    A unified, role-aware endpoint for dashboard analytics.
    Provides KPIs, performance breakdowns, and actionable insights tailored to the user's role.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get Role-Aware Dashboard Analytics",
        description="""
        Provides a comprehensive set of analytics tailored to the user's role.
        - **Agents** see their personal performance metrics.
        - **Branch Managers** see aggregated data for their branch and can filter by agent.
        - **Agency Admins** see data for the whole agency and can filter by agent or branch.
        Requires `analytics.view_dashboard_summary` permission for manager/admin views.
        """,
        parameters=[
            OpenApiParameter(name='date_from', description='Start date for filtering (YYYY-MM-DD)', type=str),
            OpenApiParameter(name='date_to', description='End date for filtering (YYYY-MM-DD)', type=str),
            OpenApiParameter(name='agent_id', description='Filter by a specific agent (Managers/Admins only)', type=str),
            OpenApiParameter(name='branch_id', description='Filter by a specific branch (Agency Admins only)', type=str),
        ]
    )
    def get(self, request, *args, **kwargs):
        user = request.user
        
        # 1. Get base querysets scoped to the user's role
        scoped_data = AnalyticsScopeService.get_scoped_querysets(user)
        policies_qs = scoped_data['policies']
        commissions_qs = scoped_data['commissions']
        leads_qs = scoped_data['leads']
        claims_qs = scoped_data['claims']

        # 2. Apply optional query parameter filters (for managers/admins)
        if user.has_perm('analytics.view_dashboard_summary'):
            # Filter by a specific agent
            agent_id = request.query_params.get("agent_id")
            if agent_id:
                # Security check: Ensure the requested agent is within the user's scope
                if not User.objects.filter(id=agent_id, agency=user.agency).exists():
                     raise exceptions.PermissionDenied("You can only filter for agents within your agency.")
                policies_qs = policies_qs.filter(agent_id=agent_id)
                commissions_qs = commissions_qs.filter(agent_id=agent_id)
                leads_qs = leads_qs.filter(assigned_agent_id=agent_id)
                claims_qs = claims_qs.filter(policy__agent_id=agent_id)

            # Filter by a specific branch (Agency Admin only)
            branch_id = request.query_params.get("branch_id")
            if branch_id and user.is_agency_admin:
                # Security check: Ensure the branch belongs to the admin's agency
                branch = get_object_or_404(AgencyBranch, id=branch_id, agency=user.agency)
                policies_qs = policies_qs.filter(branch=branch)
                commissions_qs = commissions_qs.filter(branch=branch)
                leads_qs = leads_qs.filter(assigned_agent__branch=branch)
                claims_qs = claims_qs.filter(policy__branch=branch)

        # 3. Apply date filters to all querysets
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        policies_qs = apply_date_filters(policies_qs, date_from, date_to)
        commissions_qs = apply_date_filters(commissions_qs, date_from, date_to)
        leads_qs = apply_date_filters(leads_qs, date_from, date_to)
        claims_qs = apply_date_filters(claims_qs, date_from, date_to, date_field='claim_date')

        # 4. Compute analytics using the final, filtered querysets
        summary_stats = AnalyticsService.get_summary_stats(policies_qs, commissions_qs, leads_qs, claims_qs)
        
        response_data = {
            "scope": scoped_data['scope'],
            "kpis": summary_stats,
            "actionable_insights": {
                "expiring_policies_in_30_days": AnalyticsService.get_expiring_policies(policies_qs)
            },
            "recent_activity": AnalyticsService.get_recent_activities(policies_qs, claims_qs),
            "filters_applied": request.query_params,
        }

        # 5. Add manager/admin-specific insights
        if user.has_perm('analytics.view_dashboard_summary'):
            response_data["performance_breakdowns"] = {
                "by_policy_type": AnalyticsService.get_policy_type_performance(policies_qs),
                "by_provider": AnalyticsService.get_provider_performance(policies_qs),
            }
            # Only agency admins see the branch-level breakdown
            if user.is_agency_admin:
                response_data["performance_breakdowns"]["by_branch"] = AnalyticsService.get_branch_performance(policies_qs)
            
            response_data["top_performers"] = {
                 "agents_by_premium": AnalyticsService.get_top_performing_agents(policies_qs)
            }

        return Response(response_data)