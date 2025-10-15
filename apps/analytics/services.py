# apps/analytics/services.py
from decimal import Decimal
from datetime import date, timedelta
from django.db.models import Sum, Count, F, Case, When, Q
from django.db.models.functions import Coalesce

from apps.commissions.models import StaffCommission
from apps.policies.models import Policy
from apps.claims.models import Claim
from apps.customers.models import Lead

class AnalyticsService:
    @staticmethod
    def get_summary_stats(policies_qs, commissions_qs, leads_qs, claims_qs) -> dict:
        """
        Takes filtered querysets and returns a dictionary of key performance indicators (KPIs).
        """
        policy_stats = policies_qs.aggregate(
            total_premium=Coalesce(Sum("total_premium_amount"), Decimal(0)),
            policy_count=Count("id")
        )
        commission_stats = commissions_qs.aggregate(
            approved=Coalesce(Sum(Case(When(status='APPROVED', then=F('commission_amount')), default=Decimal(0))), Decimal(0)),
            pending=Coalesce(Sum(Case(When(status='PENDING_APPROVAL', then=F('commission_amount')), default=Decimal(0))), Decimal(0))
        )
        lead_stats = leads_qs.aggregate(
            total_leads=Count('id'),
            converted_leads=Count(Case(When(status='CONVERTED', then=1)))
        )
        claim_stats = claims_qs.aggregate(
            claims_count=Count('id'),
            total_claimed=Coalesce(Sum("estimated_loss_amount"), Decimal(0))
        )
        
        conversion_rate = (lead_stats['converted_leads'] / lead_stats['total_leads'] * 100) if lead_stats['total_leads'] > 0 else 0

        return {
            "total_premium_written": policy_stats['total_premium'],
            "policies_sold": policy_stats['policy_count'],
            "commission_earned_approved": commission_stats['approved'],
            "commission_earned_pending": commission_stats['pending'],
            "lead_conversion_rate_percent": round(conversion_rate, 2),
            "claims_filed_count": claim_stats['claims_count'],
            "claims_total_value": claim_stats['total_claimed'],
        }

    @staticmethod
    def get_branch_performance(policies_qs) -> list:
        """For Agency Admins: Returns performance metrics aggregated by branch."""
        return list(policies_qs
            .values('branch__branch_name', 'branch__id')
            .annotate(
                total_premium=Coalesce(Sum('total_premium_amount'), Decimal(0)),
                policies_count=Count('id')
            )
            .order_by('-total_premium')
            .values('branch__branch_name', 'branch__id', 'total_premium', 'policies_count')
        )

    @staticmethod
    def get_policy_type_performance(policies_qs) -> list:
        """For Managers/Admins: Returns performance metrics aggregated by policy type."""
        return list(policies_qs
            .values('policy_type__name')
            .annotate(
                total_premium=Coalesce(Sum('total_premium_amount'), Decimal(0)),
                policies_count=Count('id')
            )
            .order_by('-total_premium')
            .values('policy_type__name', 'total_premium', 'policies_count')
        )

    @staticmethod
    def get_provider_performance(policies_qs) -> list:
        """For Managers/Admins: Returns performance metrics aggregated by provider."""
        return list(policies_qs
            .values('provider__name')
            .annotate(
                total_premium=Coalesce(Sum('total_premium_amount'), Decimal(0)),
                policies_count=Count('id')
            )
            .order_by('-total_premium')
            .values('provider__name', 'total_premium', 'policies_count')
        )

    @staticmethod
    def get_top_performing_agents(policies_qs) -> list:
        """For Managers/Admins: Returns top 5 agents by total premium sold."""
        top_agents = policies_qs.values('agent__first_name', 'agent__last_name', 'agent__id') \
            .annotate(total_premium=Sum('total_premium_amount'), policies_count=Count('id')) \
            .order_by('-total_premium')[:5]
        return [
            {
                "agent_id": str(agent['agent__id']),
                "agent_name": f"{agent['agent__first_name']} {agent['agent__last_name']}",
                "total_premium": agent['total_premium'],
                "policies_sold": agent['policies_count'],
            } for agent in top_agents
        ]
    
    @staticmethod
    def get_expiring_policies(policies_qs, days=30) -> list:
        """Returns up to 10 policies that are expiring within the next X days."""
        today = date.today()
        expiry_date = today + timedelta(days=days)
        expiring = policies_qs.filter(
            status=Policy.Status.ACTIVE,
            policy_end_date__gte=today,
            policy_end_date__lte=expiry_date
        ).select_related('customer').order_by('policy_end_date')[:10]
        return [
            {
                "policy_id": str(p.id),
                "policy_number": p.policy_number,
                "customer_name": p.customer.__str__(),
                "expiry_date": p.policy_end_date,
            } for p in expiring
        ]
    
    @staticmethod
    def get_recent_activities(policies_qs, claims_qs) -> dict:
        """Returns the 5 most recent policies and claims."""
        recent_policies = policies_qs.select_related('customer').order_by('-created_at')[:5]
        recent_claims = claims_qs.select_related('policy', 'claimant').order_by('-created_at')[:5]
        return {
            "policies_sold": [
                {"policy_id": str(p.id), "policy_number": p.policy_number, "customer_name": p.customer.__str__(), "premium": p.total_premium_amount, "date": p.created_at} 
                for p in recent_policies
            ],
            "claims_filed": [
                {"claim_id": str(c.id), "claim_number": c.claim_number, "policy_number": c.policy.policy_number, "customer_name": c.claimant.__str__(), "date": c.created_at} 
                for c in recent_claims
            ]
        }