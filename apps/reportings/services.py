# apps/reports/services.py
from django.db import models
from django.db.models import Sum, Count, F, Value
from django.db.models.functions import Concat
from apps.policies.models import Policy
from apps.commissions.models import StaffCommission
from apps.customers.models import Lead, Customer
from apps.claims.models import Claim

class ReportingService:
    # --- SUMMARY REPORTS (Aggregated Data) ---

    @staticmethod
    def generate_sales_summary_by_agent(policies_qs, **filters):
        """Generates a sales production report, grouped by agent."""
        return list(policies_qs.values(
            'agent__first_name', 'agent__last_name'
        ).annotate(
            policies_sold=Count('id'),
            total_premium=Sum('total_premium_amount')
        ).order_by('-total_premium'))

    @staticmethod
    def generate_commissions_summary_by_agent(commissions_qs, **filters):
        """Generates a commission summary report, grouped by agent and status."""
        return list(commissions_qs.values(
            'agent__first_name', 'agent__last_name', 'status'
        ).annotate(
            commission_count=Count('id'),
            total_amount=Sum('commission_amount')
        ).order_by('agent__first_name', 'status'))

    @staticmethod
    def generate_lead_performance_summary_by_agent(leads_qs, **filters):
        """Generates a lead performance report, grouped by agent."""
        return list(leads_qs.values(
            'assigned_agent__first_name', 'assigned_agent__last_name'
        ).annotate(
            total_leads=Count('id'),
            converted_leads=Count('id', filter=models.Q(status=Lead.LeadStatus.CONVERTED)),
            lost_leads=Count('id', filter=models.Q(status=Lead.LeadStatus.LOST))
        ).order_by('-total_leads'))

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
            'provider__name', 'policy_type__name', 'total_premium_amount', 
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
            'date_of_loss', 'status', 'estimated_loss_amount', 'settled_amount', 'created_at' # <-- FIX: Corrected field name
        ).order_by('-created_at'))