# apps/commissions/services.py
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count
from typing import Optional

# No model imports at the top level of this file.

class CommissionGenerationError(Exception):
    """Custom exception for commission generation failures."""
    pass

class CommissionService:
    @staticmethod
    def _get_agent_monthly_production(agent: "User", payout_basis: str, date: "datetime.date") -> Decimal:
        """
        Calculates the agent's total production for the given month so far.
        """
        from apps.finances.models import AgencyRevenue
        from django.db.models import Sum
        
        queryset = AgencyRevenue.objects.filter(
            policy__agent=agent,
            date_recognized__month=date.month,
            date_recognized__year=date.year
        )
        
        if payout_basis == "AGENCY_COMMISSION":
            return queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        else: # TOTAL_PREMIUM
            installment_total = queryset.filter(installment__isnull=False).aggregate(total=Sum('installment__amount'))['total'] or Decimal('0.00')
            policy_only_total = queryset.filter(installment__isnull=True).aggregate(total=Sum('policy__premium_amount'))['total'] or Decimal('0.00')
            return installment_total + policy_only_total

    @staticmethod
    def _find_staff_rule(agent: "User", policy_type: "PolicyType") -> Optional["StaffCommissionRule"]:
        """
        Finds the most specific rule for a staff member.
        Priority: 1. User + PolicyType -> 2. User only -> 3. Agency Default + PolicyType -> 4. Agency Default only
        """
        from .models import StaffCommissionRule
        
        # 1. User + PolicyType
        rule = StaffCommissionRule.objects.filter(
            agency=agent.agency, user=agent, policy_type=policy_type
        ).first()
        if rule: return rule
        
        # 2. User only (generic)
        rule = StaffCommissionRule.objects.filter(
            agency=agent.agency, user=agent, policy_type=None
        ).first()
        if rule: return rule

        # 3. Agency Default + PolicyType
        rule = StaffCommissionRule.objects.filter(
            agency=agent.agency, user=None, policy_type=policy_type
        ).first()
        if rule: return rule

        # 4. Agency Default only
        return StaffCommissionRule.objects.filter(
            agency=agent.agency, user=None, policy_type=None
        ).first()

    @staticmethod
    def generate_for_policy(policy: "Policy"):
        """
        Generates commission for a fully paid, non-installment policy upon activation.
        """
        from .models import ProviderCommissionStructure, StaffCommission
        from django.utils import timezone
        
        agent = policy.agent
        provider = policy.provider
        policy_type = policy.policy_type
        today = timezone.now().date()

        provider_structure = ProviderCommissionStructure.objects.filter(
            agency=policy.agency, provider=provider, policy_type=policy_type, 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        ).first()

        if not provider_structure:
            raise CommissionGenerationError(f"No Provider Commission Structure found for this policy.")
        
        agency_commission = (provider_structure.rate_percentage / Decimal(100)) * policy.premium_amount
        
        agent_rule = CommissionService._find_staff_rule(agent, policy_type)
        if agent_rule:
            # --- Threshold Logic ---
            production_value = policy.premium_amount if agent_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
            previous_production = CommissionService._get_agent_monthly_production(agent, agent_rule.payout_basis, today)
            
            # How much of the current production is above the monthly threshold?
            # Example: Threshold 5000, Prev 4000, Current 2000 -> Total 6000 -> Excess 1000.
            total_production = previous_production + production_value
            eligible_production = max(Decimal('0.00'), total_production - agent_rule.monthly_threshold)
            
            # The amount of the CURRENT production that qualifies for commission
            commissionable_amount = min(production_value, eligible_production)
            
            if commissionable_amount > 0:
                amount = (agent_rule.rate_percentage / Decimal(100)) * commissionable_amount
                StaffCommission.objects.create(
                    agency=agent.agency, branch=agent.branch, agent=agent, policy=policy,
                    commission_type="PAYOUT", commission_amount=amount,
                    applied_rule_details={
                        "rule_id": str(agent_rule.id),
                        "threshold_applied": str(agent_rule.monthly_threshold),
                        "production_before": str(previous_production),
                        "commissionable_base": str(commissionable_amount)
                    }
                )
        
        # --- Track Agency Revenue (Gross) ---
        from apps.finances.models import AgencyRevenue
        AgencyRevenue.objects.create(
            agency=policy.agency,
            policy=policy,
            amount=agency_commission,
            date_recognized=today,
            description=f"Commission from Provider {provider.name} for Policy {policy.policy_number}"
        )
        
        if agent.manager:
            manager_rule = CommissionService._find_staff_rule(agent.manager, policy_type)
            if manager_rule:
                # Manager commission usually isn't subject to the individual agent's threshold, 
                # but it might be subject to the manager's own threshold if they were the primary agent.
                # For upline/overrides, we typically pay on the full amount unless specified otherwise.
                # Let's stick to full amount for upline for now.
                base_amount = policy.premium_amount if manager_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
                amount = (manager_rule.rate_percentage / Decimal(100)) * base_amount
                StaffCommission.objects.create(
                    agency=agent.manager.agency, branch=agent.manager.branch, agent=agent.manager, policy=policy,
                    commission_type="UPLINE", commission_amount=amount,
                    applied_rule_details={"rule_id": str(manager_rule.id), "from_agent_id": str(agent.id)}
                )

    @staticmethod
    def generate_for_installment(installment: "PolicyInstallment"):
        """
        Generates commission for a single installment payment.
        """
        from .models import ProviderCommissionStructure, StaffCommission
        from django.utils import timezone

        policy = installment.policy
        agent = policy.agent
        provider = policy.provider
        policy_type = policy.policy_type
        today = timezone.now().date()

        provider_structure = ProviderCommissionStructure.objects.filter(
            agency=policy.agency, provider=provider, policy_type=policy_type, 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        ).first()

        if not provider_structure:
            raise CommissionGenerationError(f"No Provider Commission Structure found for policy type '{policy_type.name}'.")
        
        agency_commission = (provider_structure.rate_percentage / Decimal(100)) * installment.amount

        agent_rule = CommissionService._find_staff_rule(agent, policy_type)
        if agent_rule:
            production_value = installment.amount if agent_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
            previous_production = CommissionService._get_agent_monthly_production(agent, agent_rule.payout_basis, today)
            
            total_production = previous_production + production_value
            eligible_production = max(Decimal('0.00'), total_production - agent_rule.monthly_threshold)
            commissionable_amount = min(production_value, eligible_production)

            if commissionable_amount > 0:
                amount = (agent_rule.rate_percentage / Decimal(100)) * commissionable_amount
                StaffCommission.objects.create(
                    agency=agent.agency, branch=agent.branch, agent=agent, policy=policy,
                    installment=installment,
                    commission_type="PAYOUT", commission_amount=amount,
                    applied_rule_details={
                        "rule_id": str(agent_rule.id),
                        "threshold_applied": str(agent_rule.monthly_threshold),
                        "production_before": str(previous_production),
                        "commissionable_base": str(commissionable_amount)
                    }
                )

        # --- Track Agency Revenue (Gross) for Installment ---
        from apps.finances.models import AgencyRevenue
        AgencyRevenue.objects.create(
            agency=policy.agency,
            policy=policy,
            installment=installment,
            amount=agency_commission,
            date_recognized=today,
            description=f"Commission from Provider {provider.name} for Installment {installment.id}"
        )
        
        if agent.manager:
            manager_rule = CommissionService._find_staff_rule(agent.manager, policy_type)
            if manager_rule:
                base_amount = installment.amount if manager_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
                amount = (manager_rule.rate_percentage / Decimal(100)) * base_amount
                StaffCommission.objects.create(
                    agency=agent.manager.agency, branch=agent.manager.branch, agent=agent.manager, policy=policy,
                    installment=installment,
                    commission_type="UPLINE", commission_amount=amount,
                    applied_rule_details={"rule_id": str(manager_rule.id), "from_agent_id": str(agent.id)}
                )

    @staticmethod
    def approve_commission(commission: "StaffCommission", approver: "User"):
        from .models import StaffCommission
        if commission.status != StaffCommission.Status.PENDING_APPROVAL:
            raise ValueError("Commission status must be 'Pending Approval'.")
        commission.status = StaffCommission.Status.APPROVED
        commission.save(update_fields=['status', 'updated_at'])
        return commission

class PayoutService:
    class PayoutError(Exception):
        pass

    @staticmethod
    @transaction.atomic
    def create_payout_batch(agency: "Agency", initiated_by: "User") -> "PayoutBatch":
        from .models import StaffCommission, PayoutBatch
        commissions = StaffCommission.objects.select_for_update().filter(
            agency=agency, status=StaffCommission.Status.APPROVED
        )
        if not commissions.exists():
            raise PayoutService.PayoutError("No approved commissions available to batch.")

        totals = commissions.aggregate(total=Sum('commission_amount'), count=Count('id'))
        batch = PayoutBatch.objects.create(
            agency=agency, initiated_by=initiated_by,
            total_amount=totals['total'], commission_count=totals['count']
        )
        commissions.update(status=StaffCommission.Status.BATCHED, payout_batch=batch)
        return batch