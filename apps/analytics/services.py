# apps/analytics/services.py

from decimal import Decimal
from datetime import date, timedelta
from django.db import models
from django.db.models import Sum, Count, F, Case, When, Q, Subquery, OuterRef
from django.db.models.functions import Coalesce

from apps.commissions.models import StaffCommission, ProviderCommissionStructure
from apps.policies.models import Policy, PolicyInstallment, PolicyType
from apps.claims.models import Claim
from apps.customers.models import Lead, Renewal

class AnalyticsService:
    @staticmethod
    def get_summary_stats(policies_qs, commissions_qs, leads_qs, claims_qs, is_agency_admin=False) -> dict:
        """
        Takes filtered querysets and returns a dictionary of key performance indicators (KPIs).
        Now includes MTD (Month-to-Date) and YTD (Year-to-Date) aggregates.
        """
        today = date.today()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        # 1. Base (Filtered) Stats - Keep these for compatibility and lead conversion
        lead_stats = leads_qs.aggregate(
            total_leads=Count('id'),
            converted_leads=Count(Case(When(status='CONVERTED', then=1)))
        )
        conversion_rate = (lead_stats['converted_leads'] / lead_stats['total_leads'] * 100) if lead_stats['total_leads'] > 0 else 0

        # 2. Compute MTD stats
        mtd_stats = AnalyticsService._get_period_stats(policies_qs, commissions_qs, claims_qs, month_start, today, is_agency_admin)
        
        # 3. Compute YTD stats
        ytd_stats = AnalyticsService._get_period_stats(policies_qs, commissions_qs, claims_qs, year_start, today, is_agency_admin)

        return {
            # Legacy fields for backward compatibility if needed, though we will update frontend
            "total_premium_written": mtd_stats['premium'],
            "policies_sold": mtd_stats['policies'],
            "lead_conversion_rate_percent": round(conversion_rate, 2),
            "claims_filed_count": mtd_stats['claims_count'],
            "claims_total_value": mtd_stats['claims_value'],
            
            # New structured period data
            "mtd": mtd_stats,
            "ytd": ytd_stats,
        }

    @staticmethod
    def _get_period_stats(policies_qs, commissions_qs, claims_qs, start_date, end_date, is_agency_admin=False):
        """Helper to get aggregates for a specific date range."""
        from .utils import apply_date_filters
        
        # Convert dates to strings for the utility function
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        p_qs = apply_date_filters(policies_qs, start_str, end_str)
        c_qs = apply_date_filters(commissions_qs, start_str, end_str)
        cl_qs = apply_date_filters(claims_qs, start_str, end_str, date_field='created_at')

        policy_stats = p_qs.aggregate(
            premium=Coalesce(Sum("premium_amount"), Decimal(0)),
            count=Count("id")
        )
        
        claim_stats = cl_qs.aggregate(
            count=Count('id'),
            value=Coalesce(Sum("estimated_loss_amount"), Decimal(0))
        )

        res = {
            "premium": policy_stats['premium'],
            "policies": policy_stats['count'],
            "claims_count": claim_stats['count'],
            "claims_value": claim_stats['value'],
        }

        if is_agency_admin:
            # Calculate true agency commission for the period
            agency_comm = AnalyticsService.get_agency_commission_stats(p_qs)
            res["commission_earned"] = agency_comm['total_agency_commission_earned']
            res["commission_earned_pending"] = Decimal(0) # Agency side doesn't have "pending" in the same way 
        else:
            # Calculate staff commission for the period
            comm_stats = c_qs.aggregate(
                approved=Coalesce(Sum(Case(When(status='APPROVED', then=F('commission_amount')), default=Decimal(0))), Decimal(0)),
                pending=Coalesce(Sum(Case(When(status='PENDING_APPROVAL', then=F('commission_amount')), default=Decimal(0))), Decimal(0))
            )
            res["commission_earned"] = comm_stats['approved']
            res["commission_earned_pending"] = comm_stats['pending']

        return res

    @staticmethod
    def get_agency_commission_stats(policies_qs) -> dict:
        """
        Calculates the total commission earned by the AGENCY from providers.
        """
        rate_subquery = ProviderCommissionStructure.objects.filter(
            provider_id=OuterRef('provider_id'),
            policy_type_id=OuterRef('policy_type_id'),
            agency_id=OuterRef('agency_id')
        ).values('rate_percentage')[:1]

        agency_commission_aggregate = policies_qs.annotate(
            provider_rate=Coalesce(Subquery(rate_subquery), Decimal(0))
        ).aggregate(
            total_agency_commission=Sum(
                # CORRECT: Consistently uses 'premium_amount'
                F('premium_amount') * F('provider_rate') / Decimal('100.0'),
                output_field=models.DecimalField()
            )
        )
        
        total = agency_commission_aggregate.get('total_agency_commission') or Decimal(0)
        return {"total_agency_commission_earned": total}

    @staticmethod
    def get_branch_performance(policies_qs) -> list:
        """For Agency Admins: Returns performance metrics aggregated by branch."""
        return list(policies_qs.values('branch__branch_name', 'branch__id').annotate(
            # CORRECT: Consistently uses 'premium_amount'
            total_premium=Coalesce(Sum('premium_amount'), Decimal(0)),
            policies_count=Count('id')
        ).order_by('-total_premium').values('branch__branch_name', 'branch__id', 'total_premium', 'policies_count'))

    @staticmethod
    def get_policy_type_performance(policies_qs) -> list:
        """For Managers/Admins: Returns performance metrics aggregated by policy type."""
        # FIX: Includes 'policy_type__id' for the frontend
        return list(policies_qs.values('policy_type__id', 'policy_type__name').annotate(
            # CORRECT: Consistently uses 'premium_amount'
            total_premium=Coalesce(Sum('premium_amount'), Decimal(0)),
            policies_count=Count('id')
        ).order_by('-total_premium').values('policy_type__id', 'policy_type__name', 'total_premium', 'policies_count'))

    @staticmethod
    def get_provider_performance(policies_qs) -> list:
        """For Managers/Admins: Returns performance metrics aggregated by provider."""
        # FIX: Includes 'provider__id' for the frontend
        return list(policies_qs.values('provider__id', 'provider__name').annotate(
            # CORRECT: Consistently uses 'premium_amount'
            total_premium=Coalesce(Sum('premium_amount'), Decimal(0)),
            policies_count=Count('id')
        ).order_by('-total_premium').values('provider__id', 'provider__name', 'total_premium', 'policies_count'))

    @staticmethod
    def get_top_performing_agents(policies_qs) -> list:
        """For Managers/Admins: Returns top 5 agents by total premium sold."""
        top_agents = policies_qs.values('agent__first_name', 'agent__last_name', 'agent__id').annotate(
            # CORRECT: Consistently uses 'premium_amount'
            total_premium=Sum('premium_amount'), policies_count=Count('id')
        ).order_by('-total_premium')[:5]
        return [{"agent_id": str(agent['agent__id']), "agent_name": f"{agent['agent__first_name']} {agent['agent__last_name']}", "total_premium": agent['total_premium'], "policies_sold": agent['policies_count']} for agent in top_agents]

    @staticmethod
    def get_expiring_policies(policies_qs, days=30) -> list:
        """Returns up to 10 policies that are expiring within the next X days."""
        today = date.today()
        expiry_date = today + timedelta(days=days)
        expiring = policies_qs.filter(
            status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING],
            policy_end_date__gte=today,
            policy_end_date__lte=expiry_date
        ).select_related('customer').order_by('policy_end_date')[:50]
        return [
            {
                "policy_id": str(p.id),
                "policy_number": p.policy_number,
                "customer_name": p.customer.__str__(),
                "expiry_date": p.policy_end_date,
            } for p in expiring
        ]
    
    @staticmethod
    def get_upcoming_installments(policies_qs, days=10) -> list:
        """Returns up to 10 upcoming installment payments due within the next X days."""
        today = date.today()
        due_date_limit = today + timedelta(days=days)
        scoped_policy_ids = policies_qs.values_list('id', flat=True)
        upcoming = PolicyInstallment.objects.filter(
            policy_id__in=scoped_policy_ids,
            status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE],
            due_date__gte=today,
            due_date__lte=due_date_limit
        ).select_related('policy__customer').order_by('due_date')[:50]
        return [{"policy_id": str(i.policy.id), "installment_id": str(i.id), "policy_number": i.policy.policy_number, "customer_name": i.policy.customer.__str__(), "due_date": i.due_date, "amount_due": i.amount} for i in upcoming]
    
    @staticmethod
    def get_upcoming_renewals(renewals_qs, days=30) -> list:
        """Returns up to 10 upcoming renewals due within the next X days."""
        today = date.today()
        future_date = today + timedelta(days=days)
        upcoming = renewals_qs.filter(
            renewal_date__gte=today,
            renewal_date__lte=future_date
        ).select_related('customer').order_by('renewal_date')[:50]
        return [{"renewal_id": str(r.id), "customer_id": str(r.customer.id), "customer_name": r.customer.__str__(), "renewal_date": r.renewal_date, "policy_type": r.policy_type_description, "current_insurer": r.current_insurer} for r in upcoming]
    
    @staticmethod
    def get_upcoming_recurring_payments(policies_qs, days=10) -> list:
        """
        Returns up to 10 upcoming recurring payments due within the next X days.
        """
        today = date.today()
        due_date_limit = today + timedelta(days=days)
        
        upcoming = policies_qs.filter(
            next_due_date__isnull=False,
            next_due_date__gte=today,
            next_due_date__lte=due_date_limit,
            payment_frequency__isnull=False
        ).exclude(
            payment_frequency=''
        ).select_related('customer').order_by('next_due_date')[:50]

        return [
            {
                "policy_id": str(p.id),
                "policy_number": p.policy_number,
                "customer_name": p.customer.__str__(),
                "next_due_date": p.next_due_date,
                # CORRECT: Uses 'premium_amount' as specified in the model help_text
                "amount_due": p.premium_amount,
                "frequency": p.get_payment_frequency_display() if p.payment_frequency else "N/A",
            } for p in upcoming
        ]

    @staticmethod
    def get_recent_activities(policies_qs, claims_qs) -> dict:
        """Returns the 5 most recent policies and claims."""
        recent_policies = policies_qs.select_related('customer').order_by('-created_at')[:5]
        recent_claims = claims_qs.select_related('policy', 'claimant').order_by('-created_at')[:5]
        return {
            "policies_sold": [{"policy_id": str(p.id), "policy_number": p.policy_number, "customer_name": p.customer.__str__(), "premium": p.premium_amount, "date": p.created_at} for p in recent_policies],
            "claims_filed": [{"claim_id": str(c.id), "claim_number": c.claim_number, "policy_number": c.policy.policy_number, "customer_name": c.claimant.__str__(), "date": c.created_at} for c in recent_claims]
        }

    @staticmethod
    def get_agent_threshold_progress(user) -> list:
        """
        Calculates the progress towards monthly thresholds for an agent.
        """
        from apps.commissions.models import StaffCommissionRule
        from apps.commissions.services import CommissionService
        
        # We only care about rules that actually have a threshold set
        rules = StaffCommissionRule.objects.filter(user=user, monthly_threshold__gt=0)
        progress_data = []
        
        # Group by payout_basis to avoid repeated production calculations
        basis_groups = {}
        today = date.today()
        for rule in rules:
            basis = rule.payout_basis
            if basis not in basis_groups:
                basis_groups[basis] = CommissionService._get_agent_monthly_production(user, basis, today)
            
            production = basis_groups[basis]
            threshold = rule.monthly_threshold
            remaining = max(Decimal('0.00'), threshold - production)
            is_reached = production >= threshold
            percentage = (production / threshold * 100) if threshold > 0 else 100
            
            progress_data.append({
                "rule_id": str(rule.id),
                "policy_type_name": rule.policy_type.name if rule.policy_type else "General (All Policies)",
                "payout_basis": basis,
                "payout_basis_display": basis.replace('_', ' ').title(),
                "current_production": production,
                "threshold": threshold,
                "remaining": remaining,
                "is_reached": is_reached,
                "percentage_complete": round(float(percentage), 2)
            })
            
        return progress_data