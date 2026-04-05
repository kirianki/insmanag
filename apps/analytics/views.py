from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, exceptions
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.shortcuts import get_object_or_404
from django.db import models

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
        - **Agents** see their personal performance metrics (staff commission).
        - **Branch Managers** see aggregated data for their branch (staff commission).
        - **Agency Admins** see data for the whole agency (true agency commission).
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
        renewals_qs = scoped_data['renewals']

        # Preserve original querysets for actionable insights that should ignore date filters
        unfiltered_policies_qs = policies_qs
        unfiltered_renewals_qs = renewals_qs

        # Determine if the user should see manager-level summary data
        can_view_summary = user.is_agency_admin or user.is_branch_manager or user.is_superuser

        # 2. Apply optional query parameter filters
        if can_view_summary:
            agent_id = request.query_params.get("agent_id")
            if agent_id:
                agent_qs = User.objects.filter(id=agent_id)
                if user.is_agency_admin: agent_qs = agent_qs.filter(agency=user.agency)
                elif user.is_branch_manager: agent_qs = agent_qs.filter(branch=user.branch)
                if not agent_qs.exists():
                     raise exceptions.PermissionDenied("You can only filter for agents within your scope.")
                policies_qs = policies_qs.filter(agent_id=agent_id)
                commissions_qs = commissions_qs.filter(agent_id=agent_id)
                leads_qs = leads_qs.filter(assigned_agent_id=agent_id)
                claims_qs = claims_qs.filter(policy__agent_id=agent_id)
                renewals_qs = renewals_qs.filter(models.Q(created_by=agent_id) | models.Q(customer__assigned_agent_id=agent_id)).distinct()

            branch_id = request.query_params.get("branch_id")
            if branch_id and (user.is_agency_admin or user.is_superuser):
                branch_qs = AgencyBranch.objects.filter(id=branch_id)
                if user.is_agency_admin: branch_qs = branch_qs.filter(agency=user.agency)
                branch = get_object_or_404(branch_qs)
                policies_qs = policies_qs.filter(branch=branch)
                commissions_qs = commissions_qs.filter(branch=branch)
                leads_qs = leads_qs.filter(assigned_agent__branch=branch)
                claims_qs = claims_qs.filter(branch=branch)
                renewals_qs = renewals_qs.filter(customer__branch=branch)

        # 3. Apply date filters for KPIs and performance breakdowns
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        policies_qs = apply_date_filters(policies_qs, date_from, date_to)
        commissions_qs = apply_date_filters(commissions_qs, date_from, date_to)
        leads_qs = apply_date_filters(leads_qs, date_from, date_to)
        claims_qs = apply_date_filters(claims_qs, date_from, date_to, date_field='created_at')
        renewals_qs = apply_date_filters(renewals_qs, date_from, date_to, date_field='renewal_date')

        # 4. Compute analytics
        is_agency_admin = user.is_agency_admin or user.is_superuser
        summary_stats = AnalyticsService.get_summary_stats(
            policies_qs, commissions_qs, leads_qs, claims_qs, is_agency_admin=is_agency_admin
        )

        response_data = {
            "scope": scoped_data['scope'],
            "kpis": summary_stats,
            "actionable_insights": {
                "expiring_policies_in_30_days": AnalyticsService.get_expiring_policies(unfiltered_policies_qs),
                "upcoming_installments_in_10_days": AnalyticsService.get_upcoming_installments(unfiltered_policies_qs, days=10),
                "upcoming_renewals_in_30_days": AnalyticsService.get_upcoming_renewals(unfiltered_renewals_qs, days=30),
                "upcoming_recurring_payments_in_10_days": AnalyticsService.get_upcoming_recurring_payments(unfiltered_policies_qs, days=10)
            },
            "recent_activity": AnalyticsService.get_recent_activities(policies_qs, claims_qs),
            "filters_applied": request.query_params,
        }

        # 5. Add manager/admin-specific insights
        if can_view_summary:
            response_data["performance_breakdowns"] = {
                "by_policy_type": AnalyticsService.get_policy_type_performance(policies_qs),
                "by_provider": AnalyticsService.get_provider_performance(policies_qs),
            }
            if user.is_agency_admin or user.is_superuser:
                response_data["performance_breakdowns"]["by_branch"] = AnalyticsService.get_branch_performance(policies_qs)
            response_data["top_performers"] = {
                 "agents_by_premium": AnalyticsService.get_top_performing_agents(policies_qs)
            }

        return Response(response_data)


class ProductionThresholdView(APIView):
    """
    Returns progress towards monthly commission thresholds.
    - Agents: See their own progress.
    - Admins/Managers: See progress for a specific agent (via agent_id) or all agents in scope.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        agent_id = request.query_params.get("agent_id")
        
        if agent_id:
            # Check permission to view this agent
            target_agent = get_object_or_404(User, id=agent_id)
            if not user.is_superuser and not user.is_agency_admin:
                if user.is_branch_manager and target_agent.branch != user.branch:
                    raise exceptions.PermissionDenied("You can only view agents in your branch.")
                elif not user.is_branch_manager and target_agent != user:
                    raise exceptions.PermissionDenied("You can only view your own progress.")
            
            progress = AnalyticsService.get_agent_threshold_progress(target_agent)
            return Response({"agent_id": agent_id, "agent_name": target_agent.get_full_name(), "progress": progress})
        
        # If no agent_id, and user is admin/manager, return all agents
        if user.is_agency_admin or user.is_branch_manager or user.is_superuser:
            agents = User.objects.filter(agency=user.agency)
            if user.is_branch_manager and not user.is_agency_admin:
                agents = agents.filter(branch=user.branch)
            
            all_progress = []
            for agent in agents:
                progress = AnalyticsService.get_agent_threshold_progress(agent)
                if progress: # Only include agents who have threshold rules
                    all_progress.append({
                        "agent_id": str(agent.id),
                        "agent_name": agent.get_full_name(),
                        "progress": progress
                    })
            return Response(all_progress)
            
        # Default for agents: see their own
        progress = AnalyticsService.get_agent_threshold_progress(user)
        return Response({"agent_id": str(user.id), "agent_name": user.get_full_name(), "progress": progress})