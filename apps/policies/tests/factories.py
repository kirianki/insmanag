# apps/policies/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from datetime import date, timedelta
from django.utils import timezone

from ..models import InsuranceProvider, PolicyType, Policy
from apps.accounts.tests.factories import AgencyFactory
from apps.customers.tests.factories import CustomerFactory

class InsuranceProviderFactory(DjangoModelFactory):
    class Meta:
        model = InsuranceProvider
        django_get_or_create = ('name',)

    name = factory.Iterator(['Britam', 'Jubilee', 'ICEA Lion', 'Madison', 'APA'])

class PolicyTypeFactory(DjangoModelFactory):
    class Meta:
        model = PolicyType
    
    agency = factory.SubFactory(AgencyFactory)
    name = factory.Iterator(['Motor Private', 'Motor Commercial', 'Domestic Package', 'Health Insurance'])

class PolicyFactory(DjangoModelFactory):
    class Meta:
        model = Policy

    # Define relationships ensuring data consistency.
    # The customer and agent will belong to the same agency.
    customer = factory.SubFactory(CustomerFactory)
    agent = factory.SelfAttribute('customer.assigned_agent')
    
    # The provider is global.
    provider = factory.SubFactory(InsuranceProviderFactory)
    
    # Ensure the policy_type and customer belong to the same agency.
    policy_type = factory.SubFactory(PolicyTypeFactory, agency=factory.SelfAttribute('..customer.agency'))
    
    # Define data fields.
    premium_amount = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True, min_value=5000)
    policy_start_date = factory.LazyFunction(date.today)
    policy_end_date = factory.LazyFunction(lambda: date.today() + timedelta(days=364))
    
    # +++ IMPROVEMENT: Make created_at configurable for date filtering tests +++
    # This defaults to the current time but can be overridden in tests.
    created_at = factory.LazyFunction(timezone.now)
    updated_at = factory.LazyFunction(timezone.now)