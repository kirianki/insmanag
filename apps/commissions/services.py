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
    def _find_staff_rule(agent: "User", policy_type: "PolicyType") -> Optional["StaffCommissionRule"]:
        """
        Finds the most specific rule for a staff member.
        Priority: 1. User + PolicyType -> 2. User only (generic)
        """
        from .models import StaffCommissionRule
        
        rule = StaffCommissionRule.objects.filter(
            agency=agent.agency, user=agent, policy_type=policy_type
        ).first()
        if rule:
            return rule
        
        return StaffCommissionRule.objects.filter(
            agency=agent.agency, user=agent, policy_type=None
        ).first()

    @staticmethod
    def generate_for_policy(policy: "Policy"):
        """
        Generates commission for a fully paid, non-installment policy upon activation.
        """
        from .models import ProviderCommissionStructure, StaffCommission
        
        agent = policy.agent
        provider = policy.provider
        policy_type = policy.policy_type

        provider_structure = ProviderCommissionStructure.objects.filter(
            agency=policy.agency, provider=provider, policy_type=policy_type, 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        ).first()

        if not provider_structure:
            raise CommissionGenerationError(f"No Provider Commission Structure found for this policy.")
        
        agency_commission = (provider_structure.rate_percentage / Decimal(100)) * policy.total_premium_amount

        agent_rule = CommissionService._find_staff_rule(agent, policy_type)
        if agent_rule:
            base_amount = policy.total_premium_amount if agent_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
            amount = (agent_rule.rate_percentage / Decimal(100)) * base_amount
            StaffCommission.objects.create(
                agency=agent.agency, branch=agent.branch, agent=agent, policy=policy,
                commission_type="PAYOUT", commission_amount=amount,
                applied_rule_details={"rule_id": str(agent_rule.id)}
            )
        
        if agent.manager:
            manager_rule = CommissionService._find_staff_rule(agent.manager, policy_type)
            if manager_rule:
                base_amount = policy.total_premium_amount if manager_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
                amount = (manager_rule.rate_percentage / Decimal(100)) * base_amount
                StaffCommission.objects.create(
                    agency=agent.manager.agency, branch=agent.manager.branch, agent=agent.manager, policy=policy,
                    commission_type="UPLINE", commission_amount=amount,
                    applied_rule_details={"rule_id": str(manager_rule.id), "from_agent_id": str(agent.id)}
                )

    # --- NEW: Service for generating commission based on an installment payment ---
    @staticmethod
    def generate_for_installment(installment: "PolicyInstallment"):
        """
        Generates commission for a single installment payment.
        """
        from .models import ProviderCommissionStructure, StaffCommission
        policy = installment.policy
        agent = policy.agent
        provider = policy.provider
        policy_type = policy.policy_type

        provider_structure = ProviderCommissionStructure.objects.filter(
            agency=policy.agency, provider=provider, policy_type=policy_type, 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        ).first()

        if not provider_structure:
            raise CommissionGenerationError(f"No Provider Commission Structure found for policy type '{policy_type.name}'.")
        
        # Agency commission is calculated based on the installment amount, not the total premium
        agency_commission = (provider_structure.rate_percentage / Decimal(100)) * installment.amount

        agent_rule = CommissionService._find_staff_rule(agent, policy_type)
        if agent_rule:
            base_amount = installment.amount if agent_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
            amount = (agent_rule.rate_percentage / Decimal(100)) * base_amount
            StaffCommission.objects.create(
                agency=agent.agency, branch=agent.branch, agent=agent, policy=policy,
                installment=installment, # Link to the specific installment
                commission_type="PAYOUT", commission_amount=amount,
                applied_rule_details={"rule_id": str(agent_rule.id)}
            )
        
        if agent.manager:
            manager_rule = CommissionService._find_staff_rule(agent.manager, policy_type)
            if manager_rule:
                base_amount = installment.amount if manager_rule.payout_basis == "TOTAL_PREMIUM" else agency_commission
                amount = (manager_rule.rate_percentage / Decimal(100)) * base_amount
                StaffCommission.objects.create(
                    agency=agent.manager.agency, branch=agent.manager.branch, agent=agent.manager, policy=policy,
                    installment=installment, # Link to the specific installment
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