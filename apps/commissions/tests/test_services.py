# apps/commissions/tests/test_services.py
import pytest
from decimal import Decimal
from ..services import CommissionService, PayoutService, CommissionGenerationError
from ..models import StaffCommission, ProviderCommissionStructure, StaffCommissionRule
from .factories import ProviderCommissionStructureFactory, StaffCommissionRuleFactory, StaffCommissionFactory
from apps.policies.tests.factories import PolicyFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory
from apps.customers.tests.factories import CustomerFactory

pytestmark = pytest.mark.django_db

class TestCommissionService:
    def test_generate_commission_based_on_total_premium(self):
        policy = PolicyFactory(premium_amount=Decimal('10000.00'))
        ProviderCommissionStructureFactory(
            agency=policy.agency,
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('10.00')
        )
        StaffCommissionRuleFactory(
            agency=policy.agent.agency,
            user=policy.agent,
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
            agency=policy.agency,
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('12.00')
        )
        StaffCommissionRuleFactory(
            agency=policy.agent.agency,
            user=policy.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.AGENCY_COMMISSION,
            rate_percentage=Decimal('20.00')
        )

        CommissionService.generate_for_policy(policy)

        commission = StaffCommission.objects.get(agent=policy.agent, policy=policy)
        assert commission.commission_amount == Decimal('240.00')

    def test_generate_commission_using_agency_default_rule(self):
        """
        Verify that if no rule exists for a specific user, 
        the agency default rule (user=None) is used.
        """
        agency = AgencyFactory()
        agent = UserFactory(agency=agency)
        customer = CustomerFactory(agency=agency, assigned_agent=agent)
        policy = PolicyFactory(premium_amount=Decimal('10000.00'), customer=customer)
        
        ProviderCommissionStructureFactory(
            agency=agency,
            provider=policy.provider,
            policy_type=policy.policy_type,
            rate_percentage=Decimal('10.00')
        )
        
        # Create an agency-wide default rule
        StaffCommissionRuleFactory(
            agency=agency,
            user=None,
            payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
            rate_percentage=Decimal('5.00')
        )

        CommissionService.generate_for_policy(policy)
        
        commission = StaffCommission.objects.get(agent=agent, policy=policy)
        assert commission.commission_amount == Decimal('500.00')

    def test_generate_upline_commission(self):
        manager = UserFactory()
        agent = UserFactory(manager=manager, agency=manager.agency)
        policy = PolicyFactory(premium_amount=Decimal('20000.00'), agent=agent, agency=agent.agency)
        
        ProviderCommissionStructureFactory(provider=policy.provider, policy_type=policy.policy_type, agency=policy.agency)
        StaffCommissionRuleFactory(user=agent, agency=agent.agency, rate_percentage=Decimal('3.00'))
        StaffCommissionRuleFactory(user=manager, agency=manager.agency, rate_percentage=Decimal('1.00'))

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
        with pytest.raises(CommissionGenerationError, match="No Provider Commission Structure found"):
            CommissionService.generate_for_policy(policy)

class TestPayoutService:
    def test_create_batch_success(self):
        agency = AgencyFactory()
        admin = UserFactory(agency=agency)
        agent1 = UserFactory(agency=agency)
        agent2 = UserFactory(agency=agency)

        StaffCommissionFactory(agent=agent1, agency=agency, status=StaffCommission.Status.APPROVED, commission_amount=100)
        StaffCommissionFactory(agent=agent2, agency=agency, status=StaffCommission.Status.APPROVED, commission_amount=150)
        StaffCommissionFactory(agent=agent1, agency=agency, status=StaffCommission.Status.PENDING_APPROVAL, commission_amount=50)
        StaffCommissionFactory(status=StaffCommission.Status.APPROVED, agency=AgencyFactory()) # Different agency

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