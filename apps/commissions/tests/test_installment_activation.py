import pytest
from decimal import Decimal
from django.utils import timezone
from apps.policies.models import Policy, PolicyInstallment
from apps.policies.services import PolicyService
from apps.commissions.models import StaffCommission
from apps.policies.tests.factories import PolicyFactory, PolicyInstallmentFactory
from apps.commissions.tests.factories import ProviderCommissionStructureFactory, StaffCommissionRuleFactory

pytestmark = pytest.mark.django_db

class TestInstallmentCommissions:
    def test_commission_generated_for_all_paid_installments_upon_activation(self):
        # 1. Setup Policy and Installments
        policy = PolicyFactory(
            premium_amount=Decimal('10000.00'),
            is_installment=True,
            status=Policy.Status.AWAITING_PAYMENT
        )
        # Create 3 installments (To ensure policy doesn't auto-complete to ACTIVE when 2 are paid)
        inst1 = PolicyInstallmentFactory(policy=policy, amount=Decimal('5000.00'), due_date=timezone.now().date())
        inst2 = PolicyInstallmentFactory(policy=policy, amount=Decimal('5000.00'), due_date=timezone.now().date())
        inst3 = PolicyInstallmentFactory(policy=policy, amount=Decimal('5000.00'), due_date=timezone.now().date())

        # 2. Setup Commission Rules
        # Provider pays 10% commission
        ProviderCommissionStructureFactory(
            agency=policy.agency,
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('10.00')
        )
        # Agent gets 50% of agency commission
        StaffCommissionRuleFactory(
            agency=policy.agent.agency,
            user=policy.agent,
            policy_type=policy.policy_type,
            payout_basis="AGENCY_COMMISSION",
            rate_percentage=Decimal('50.00')
        )

        # 3. Pay Installment 1
        PolicyService.record_installment_payment(inst1, paid_on=timezone.now().date(), transaction_reference="TX1")
        inst1.refresh_from_db()
        assert inst1.status == PolicyInstallment.Status.PAID
        
        policy.refresh_from_db()
        assert policy.status == Policy.Status.PAID_PENDING_ACTIVATION

        # 4. Pay Installment 2 (Before activation!)
        PolicyService.record_installment_payment(inst2, paid_on=timezone.now().date(), transaction_reference="TX2")
        inst2.refresh_from_db()
        assert inst2.status == PolicyInstallment.Status.PAID

        # 5. Activate Policy
        PolicyService.activate_policy(policy, insurance_certificate_number="CERT-123")
        
        policy.refresh_from_db()
        assert policy.status == Policy.Status.ACTIVE_INSTALLMENT

        # 6. Verify Commissions
        # We expect 2 commissions: one for each installment
        commissions = StaffCommission.objects.filter(policy=policy, agent=policy.agent)
        
        # This claim is expected to fail until the fix is implemented
        assert commissions.count() == 2, f"Expected 2 commissions, found {commissions.count()}"
        
        for comm in commissions:
            assert comm.commission_amount == Decimal('250.00')
