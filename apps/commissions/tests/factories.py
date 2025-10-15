# apps/commissions/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from datetime import datetime
from django.utils import timezone

from ..models import (
    CustomerPayment, ProviderCommissionStructure, StaffCommissionRule,
    PayoutBatch, StaffCommission
)
from apps.policies.tests.factories import PolicyFactory, PolicyTypeFactory, InsuranceProviderFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory

class CustomerPaymentFactory(DjangoModelFactory):
    class Meta:
        model = CustomerPayment

    policy = factory.SubFactory(PolicyFactory)
    customer = factory.SelfAttribute('policy.customer')
    amount = factory.SelfAttribute('policy.premium_amount')
    mpesa_reference = factory.Sequence(lambda n: f"QWE{n:04d}RTY")
    payment_date = factory.LazyFunction(timezone.now)

class ProviderCommissionStructureFactory(DjangoModelFactory):
    class Meta:
        model = ProviderCommissionStructure
        django_get_or_create = ('provider', 'policy_type', 'commission_type')

    provider = factory.SubFactory(InsuranceProviderFactory)
    policy_type = factory.SubFactory(PolicyTypeFactory)
    commission_type = ProviderCommissionStructure.CommissionType.NEW_BUSINESS
    
    # FIX: Increased left_digits to 2 to accommodate the max_value of 15.
    rate_percentage = factory.Faker('pydecimal', left_digits=2, right_digits=2, min_value=5, max_value=15)

class StaffCommissionRuleFactory(DjangoModelFactory):
    class Meta:
        model = StaffCommissionRule

    user = factory.SubFactory(UserFactory)
    payout_basis = StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM
    rate_percentage = factory.Faker('pydecimal', left_digits=1, right_digits=2, min_value=1, max_value=5)

class PayoutBatchFactory(DjangoModelFactory):
    class Meta:
        model = PayoutBatch
    
    agency = factory.SubFactory(AgencyFactory)
    initiated_by = factory.SubFactory(UserFactory, agency=factory.SelfAttribute('..agency'))

class StaffCommissionFactory(DjangoModelFactory):
    class Meta:
        model = StaffCommission

    agent = factory.SubFactory(UserFactory)
    policy = factory.SubFactory(PolicyFactory, agent=factory.SelfAttribute('..agent'))
    commission_type = StaffCommission.CommissionType.PAYOUT
    commission_amount = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True)
    status = StaffCommission.Status.PENDING_APPROVAL
    created_at = factory.LazyFunction(timezone.now)
    updated_at = factory.LazyFunction(timezone.now)