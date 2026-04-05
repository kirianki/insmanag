# apps/commissions/tests/test_thresholds.py
import pytest
from decimal import Decimal
from django.utils import timezone
from ..services import CommissionService
from ..models import StaffCommission, StaffCommissionRule, ProviderCommissionStructure
from .factories import StaffCommissionRuleFactory, ProviderCommissionStructureFactory
from apps.policies.tests.factories import PolicyFactory, PolicyTypeFactory, InsuranceProviderFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory
from apps.customers.tests.factories import CustomerFactory
from apps.finances.models import AgencyRevenue

pytestmark = pytest.mark.django_db

class TestCommissionThresholds:
    def setup_method(self):
        self.today = timezone.now().date()
        self.agency = AgencyFactory()
        self.agent = UserFactory(agency=self.agency)
        self.customer = CustomerFactory(agency=self.agency, assigned_agent=self.agent)
        self.provider = InsuranceProviderFactory()
        self.policy_type = PolicyTypeFactory(agency=self.agency)
        
        # Explicitly ensure the provider structure exists for this agency
        self.provider_structure = ProviderCommissionStructureFactory(
            agency=self.agency,
            provider=self.provider,
            policy_type=self.policy_type,
            rate_percentage=Decimal('10.00'),
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        )

    def test_commission_not_earned_below_threshold(self):
        """
        Agent has a $5000 threshold (Total Premium basis).
        They do a $3000 policy. Commission should be $0.
        """
        rule = StaffCommissionRuleFactory(
            agency=self.agency,
            user=self.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
            rate_percentage=Decimal('10.00'),
            monthly_threshold=Decimal('5000.00')
        )
        policy = PolicyFactory(
            customer=self.customer,
            premium_amount=Decimal('3000.00'), 
            agent=self.agent, 
            agency=self.agency,
            policy_type=self.policy_type,
            provider=self.provider
        )
        
        # Ensure policy's agency is correct
        assert policy.agency == self.agency
        assert policy.policy_type.agency == self.agency

        CommissionService.generate_for_policy(policy)

        # No commission record should be created for the agent
        assert not StaffCommission.objects.filter(agent=self.agent, policy=policy, commission_type="PAYOUT").exists()
        
        # Verify that without threshold, it would have been created
        rule.monthly_threshold = Decimal('0.00')
        rule.save()
        CommissionService.generate_for_policy(policy)
        assert StaffCommission.objects.filter(agent=self.agent, policy=policy, commission_type="PAYOUT").exists()

    def test_commission_partial_earned_when_crossing_threshold(self):
        """
        Threshold $5000. 
        1st policy: $4000 -> $0 comm.
        2nd policy: $2000 -> Total $6000. Comm should be on $1000 excess.
        Rate: 10%. Comm should be $100.
        """
        rule = StaffCommissionRuleFactory(
            agency=self.agency,
            user=self.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
            rate_percentage=Decimal('10.00'),
            monthly_threshold=Decimal('5000.00')
        )

        # 1st Policy
        p1 = PolicyFactory(customer=self.customer, premium_amount=Decimal('4000.00'), agent=self.agent, agency=self.agency, policy_type=self.policy_type, provider=self.provider)
        CommissionService.generate_for_policy(p1)
        assert not StaffCommission.objects.filter(agent=self.agent, policy=p1, commission_type="PAYOUT").exists()

        # 2nd Policy
        p2 = PolicyFactory(customer=self.customer, premium_amount=Decimal('2000.00'), agent=self.agent, agency=self.agency, policy_type=self.policy_type, provider=self.provider)
        CommissionService.generate_for_policy(p2)
        
        comm = StaffCommission.objects.get(agent=self.agent, policy=p2, commission_type="PAYOUT")
        # Excess is $6000 - $5000 = $1000. 10% of $1000 = $100.
        assert comm.commission_amount == Decimal('100.00')

    def test_commission_full_earned_after_threshold_met(self):
        """
        Threshold $5000.
        Prev production: $6000.
        New policy: $2000.
        Comm should be on full $2000. 10% -> $200.
        """
        rule = StaffCommissionRuleFactory(
            agency=self.agency,
            user=self.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
            rate_percentage=Decimal('10.00'),
            monthly_threshold=Decimal('5000.00')
        )
        
        # Simulate previous production
        p0 = PolicyFactory(customer=self.customer, premium_amount=Decimal('6000.00'), agent=self.agent, agency=self.agency, policy_type=self.policy_type, provider=self.provider)
        CommissionService.generate_for_policy(p0)
        
        # 2nd Policy
        p1 = PolicyFactory(customer=self.customer, premium_amount=Decimal('2000.00'), agent=self.agent, agency=self.agency, policy_type=self.policy_type, provider=self.provider)
        CommissionService.generate_for_policy(p1)
        
        comm = StaffCommission.objects.get(agent=self.agent, policy=p1, commission_type="PAYOUT")
        assert comm.commission_amount == Decimal('200.00')

    def test_threshold_on_agency_commission_basis(self):
        """
        Basis: AGENCY_COMMISSION.
        Threshold: $500.
        """
        rule = StaffCommissionRuleFactory(
            agency=self.agency,
            user=self.agent,
            payout_basis=StaffCommissionRule.PayoutBasis.AGENCY_COMMISSION,
            rate_percentage=Decimal('50.00'),
            monthly_threshold=Decimal('500.00')
        )
        
        # 1st Policy: $8000 * 5% = $400 Agency Comm
        pt1 = PolicyTypeFactory(agency=self.agency, name="Type 1")
        ProviderCommissionStructureFactory(
            agency=self.agency, 
            provider=self.provider, 
            policy_type=pt1, 
            rate_percentage=Decimal('5.00'), 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        )
        p1 = PolicyFactory(premium_amount=Decimal('8000.00'), customer=self.customer, agent=self.agent, agency=self.agency, policy_type=pt1, provider=self.provider)
        CommissionService.generate_for_policy(p1)
        assert not StaffCommission.objects.filter(agent=self.agent, policy=p1, commission_type="PAYOUT").exists()

        # 2nd Policy: $10000 * 6% = $600 Agency Comm
        pt2 = PolicyTypeFactory(agency=self.agency, name="Type 2")
        ProviderCommissionStructureFactory(
            agency=self.agency, 
            provider=self.provider, 
            policy_type=pt2, 
            rate_percentage=Decimal('6.00'), 
            commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS
        )
        p2 = PolicyFactory(premium_amount=Decimal('10000.00'), customer=self.customer, agent=self.agent, agency=self.agency, policy_type=pt2, provider=self.provider)
        CommissionService.generate_for_policy(p2)
        
        comm = StaffCommission.objects.get(agent=self.agent, policy=p2, commission_type="PAYOUT")
        # Prev: $400. Curr: $600. Total: $1000. Threshold: $500. Excess: $500.
        # 50% of $500 = $250.
        assert comm.commission_amount == Decimal('250.00')
