from django.db import models
from django.db.models import Sum, Count, F, Value, Q
from django.db.models.functions import Concat, TruncDate, TruncMonth, TruncYear
from apps.policies.models import Policy
from apps.commissions.models import StaffCommission
from apps.customers.models import Lead, Customer
from apps.claims.models import Claim

class ReportingService:
    # --- HELPER METHODS ---

    @staticmethod
    def _truncate_date(queryset, interval, date_field='created_at'):
        """Truncates the date field based on the requested interval."""
        if interval == 'daily':
            return queryset.annotate(period=TruncDate(date_field))
        elif interval == 'monthly':
            return queryset.annotate(period=TruncMonth(date_field))
        elif interval == 'yearly':
            return queryset.annotate(period=TruncYear(date_field))
        return queryset

    # --- SUMMARY REPORTS (Aggregated Data) ---

    @staticmethod
    def generate_overall_sales_summary(policies_qs, interval=None, **filters):
        """Generates a high-level summary of sales performance, supporting trends."""
        if interval:
            qs = ReportingService._truncate_date(policies_qs, interval, 'policy_start_date')
            return list(qs.values('period').annotate(
                total_policies_sold=Count('id'),
                total_premium_written=Sum('premium_amount')
            ).order_by('period'))
        
        summary = policies_qs.aggregate(
            total_policies_sold=Count('id'),
            total_premium_written=Sum('premium_amount')
        )
        total_policies = summary.get('total_policies_sold') or 0
        total_premium = summary.get('total_premium_written') or 0
        summary['average_premium_per_policy'] = (
            total_premium / total_policies if total_policies > 0 else 0
        )
        return [summary]

    @staticmethod
    def generate_sales_summary_by_agent(policies_qs, interval=None, **filters):
        """Generates a sales production report, grouped by agent and optionally by period."""
        fields = ['agent__first_name', 'agent__last_name']
        if interval:
            policies_qs = ReportingService._truncate_date(policies_qs, interval, 'policy_start_date')
            fields.append('period')
            
        return list(policies_qs.values(*fields).annotate(
            policies_sold=Count('id'),
            total_premium=Sum('premium_amount')
        ).order_by('-total_premium' if not interval else 'period'))

    @staticmethod
    def generate_commissions_summary_by_agent(commissions_qs, interval=None, **filters):
        """Generates a commission summary report, grouped by agent and status, optionally by period."""
        fields = ['agent__first_name', 'agent__last_name', 'status']
        if interval:
            commissions_qs = ReportingService._truncate_date(commissions_qs, interval, 'created_at')
            fields.append('period')

        return list(commissions_qs.values(*fields).annotate(
            commission_count=Count('id'),
            total_amount=Sum('commission_amount')
        ).order_by('agent__first_name', 'status', 'period' if interval else 'agent__first_name'))

    @staticmethod
    def generate_lead_performance_summary_by_agent(leads_qs, interval=None, **filters):
        """Generates a lead performance report, grouped by agent and optionally by period."""
        fields = ['assigned_agent__first_name', 'assigned_agent__last_name']
        if interval:
            leads_qs = ReportingService._truncate_date(leads_qs, interval, 'created_at')
            fields.append('period')

        return list(leads_qs.values(*fields).annotate(
            total_leads=Count('id'),
            converted_leads=Count('id', filter=Q(status=Lead.LeadStatus.CONVERTED)),
            lost_leads=Count('id', filter=Q(status=Lead.LeadStatus.LOST))
        ).order_by('-total_leads' if not interval else 'period'))

    @staticmethod
    def generate_sales_summary_by_policy_type(policies_qs, **filters):
        """Generates a sales production report, grouped by policy type."""
        # Categorical reports usually don't need time grouping as primary view, but could.
        # For now, keeping it simple as these are intended for Pie Charts.
        return list(policies_qs.values(
            'policy_type__name'
        ).annotate(
            policy_count=Count('id'),
            total_premium=Sum('premium_amount')
        ).order_by('-total_premium'))

    @staticmethod
    def generate_sales_summary_by_provider(policies_qs, **filters):
        """Generates a sales production report, grouped by insurance provider."""
        return list(policies_qs.values(
            'provider__name'
        ).annotate(
            policy_count=Count('id'),
            total_premium=Sum('premium_amount')
        ).order_by('-total_premium'))

    @staticmethod
    def generate_overall_claims_summary(claims_qs, interval=None, **filters):
        """Generates a high-level summary of claims activity, supporting trends."""
        if interval:
            qs = ReportingService._truncate_date(claims_qs, interval, 'date_of_loss')
            return list(qs.values('period').annotate(
                total_claims_filed=Count('id'),
                total_estimated_loss=Sum('estimated_loss_amount'),
                total_settled_amount=Sum('settled_amount'),
                open_claims=Count('id', filter=~Q(status__in=[Claim.Status.SETTLED, Claim.Status.CLOSED, Claim.Status.REJECTED]))
            ).order_by('period'))

        summary = claims_qs.aggregate(
            total_claims_filed=Count('id'),
            total_estimated_loss=Sum('estimated_loss_amount'),
            total_settled_amount=Sum('settled_amount'),
            open_claims=Count('id', filter=~Q(status__in=[Claim.Status.SETTLED, Claim.Status.CLOSED, Claim.Status.REJECTED]))
        )
        return [summary]

    # --- DETAIL REPORTS (Itemized Lists) ---

    @staticmethod
    def generate_policies_detail_report(policies_qs, **filters):
        """Generates a detailed, itemized report of policies."""
        if 'status' in filters:
            policies_qs = policies_qs.filter(status=filters['status'])
        if 'agent_id' in filters:
            policies_qs = policies_qs.filter(agent_id=filters['agent_id'])
            
        return list(policies_qs.annotate(
            customer_name=Concat('customer__first_name', Value(' '), 'customer__last_name'),
            agent_name=Concat('agent__first_name', Value(' '), 'agent__last_name')
        ).values(
            'policy_number', 'customer_name', 'agent_name', 
            'provider__name', 'policy_type__name', 'premium_amount',
            'policy_start_date', 'policy_end_date', 'status', 'created_at'
        ).order_by('-created_at'))

    @staticmethod
    def generate_customers_detail_report(customers_qs, **filters):
        """Generates a detailed, itemized report of customers."""
        if 'kyc_status' in filters:
            customers_qs = customers_qs.filter(kyc_status=filters['kyc_status'])
        if 'agent_id' in filters:
            customers_qs = customers_qs.filter(assigned_agent_id=filters['agent_id'])

        return list(customers_qs.annotate(
            agent_name=Concat('assigned_agent__first_name', Value(' '), 'assigned_agent__last_name')
        ).values(
            'customer_number', 'first_name', 'last_name', 'phone', 'email',
            'agent_name', 'kyc_status', 'created_at'
        ).order_by('-created_at'))
        
    @staticmethod
    def generate_claims_detail_report(claims_qs, **filters):
        """Generates a detailed, itemized report of claims."""
        if 'status' in filters:
            claims_qs = claims_qs.filter(status=filters['status'])
        if 'agent_id' in filters:
            claims_qs = claims_qs.filter(policy__agent_id=filters['agent_id'])

        return list(claims_qs.annotate(
            claimant_name=Concat('claimant__first_name', Value(' '), 'claimant__last_name'),
            agent_name=Concat('policy__agent__first_name', Value(' '), 'policy__agent__last_name')
        ).values(
            'claim_number', 'policy__policy_number', 'claimant_name', 'agent_name',
            'date_of_loss', 'status', 'estimated_loss_amount', 'settled_amount', 'created_at'
        ).order_by('-created_at'))