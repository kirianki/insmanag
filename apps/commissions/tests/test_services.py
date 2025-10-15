# apps/commissions/tests/test_services.py
import pytest
from decimal import Decimal
from ..services import CommissionService, PayoutService, CommissionGenerationError
from ..models import StaffCommission, ProviderCommissionStructure, StaffCommissionRule
from .factories import ProviderCommissionStructureFactory, StaffCommissionRuleFactory, StaffCommissionFactory
from apps.policies.tests.factories import PolicyFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory

pytestmark = pytest.mark.django_db

class TestCommissionService:
    def test_generate_commission_based_on_total_premium(self):
        policy = PolicyFactory(premium_amount=Decimal('10000.00'))
        ProviderCommissionStructureFactory(
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('10.00')
        )
        StaffCommissionRuleFactory(
            user=policy.agent,
            provider=policy.provider,
            policy_type=policy.policy_type,
            payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
            rate_percentage=Decimal('2.50')
        )

        CommissionService.generate_for_policy(policy)
        
        commission = StaffCommission.objects.get(agent=policy.agent, policy=policy)
        assert commission.commission_amount == Decimal('250.00')

    def test_generate_commission_based_on_agency_commission(self):
        policy = PolicyFactory(premium_amount=Decimal('10000.00'))
        ProviderCommissionStructureFactory(
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('12.00')
        )
        StaffCommissionRuleFactory(
            user=policy.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.AGENCY_COMMISSION,
            rate_percentage=Decimal('20.00')
        )

        CommissionService.generate_for_policy(policy)

        commission = StaffCommission.objects.get(agent=policy.agent, policy=policy)
        assert commission.commission_amount == Decimal('240.00')

    def test_generate_upline_commission(self):
        manager = UserFactory()
        agent = UserFactory(manager=manager)
        policy = PolicyFactory(premium_amount=Decimal('20000.00'), agent=agent)
        
        ProviderCommissionStructureFactory(provider=policy.provider, policy_type=policy.policy_type)
        StaffCommissionRuleFactory(user=agent, rate_percentage=Decimal('3.00'))
        StaffCommissionRuleFactory(user=manager, rate_percentage=Decimal('1.00'))

        CommissionService.generate_for_policy(policy)

        assert StaffCommission.objects.count() == 2
        agent_comm = StaffCommission.objects.get(agent=agent)
        manager_comm = StaffCommission.objects.get(agent=manager)

        assert agent_comm.commission_amount == Decimal('600.00')
        assert manager_comm.commission_amount == Decimal('200.00')
        assert manager_comm.commission_type == StaffCommission.CommissionType.UPLINE
        assert manager_comm.applied_rule_details['from_agent_id'] == str(agent.id)

    def test_raises_error_if_no_provider_structure(self):
        policy = PolicyFactory()
        with pytest.raises(CommissionGenerationError, match="No ProviderCommissionStructure found"):
            CommissionService.generate_for_policy(policy)

class TestPayoutService:
    def test_create_batch_success(self):
        agency = AgencyFactory()
        admin = UserFactory(agency=agency)
        agent1 = UserFactory(agency=agency)
        agent2 = UserFactory(agency=agency)

        StaffCommissionFactory(agent=agent1, status=StaffCommission.Status.APPROVED, commission_amount=100)
        StaffCommissionFactory(agent=agent2, status=StaffCommission.Status.APPROVED, commission_amount=150)
        StaffCommissionFactory(agent=agent1, status=StaffCommission.Status.PENDING_APPROVAL, commission_amount=50)
        StaffCommissionFactory(status=StaffCommission.Status.APPROVED)

        batch = PayoutService.create_payout_batch(agency, admin)

        assert batch is not None
        assert batch.commission_count == 2
        assert batch.total_amount == Decimal('250.00')
        assert StaffCommission.objects.filter(status=StaffCommission.Status.BATCHED, payout_batch=batch).count() == 2
        assert StaffCommission.objects.filter(status=StaffCommission.Status.APPROVED, agent__agency=agency).count() == 0

    def test_create_batch_fails_if_no_approved_commissions(self):
        agency = AgencyFactory()
        admin = UserFactory(agency=agency)
        StaffCommissionFactory(agent__agency=agency, status=StaffCommission.Status.PENDING_APPROVAL)

        with pytest.raises(PayoutService.PayoutError, match="No approved commissions available to batch."):
            PayoutService.create_payout_batch(agency, admin)