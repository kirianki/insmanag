# apps/auditing/tests/factories.py
import factory
from factory.django import DjangoModelFactory

from ..models import SystemLog
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgencyBranchFactory

class SystemLogFactory(DjangoModelFactory):
    class Meta:
        model = SystemLog

    agency = factory.SubFactory(AgencyFactory)
    branch = factory.SubFactory(AgencyBranchFactory, agency=factory.SelfAttribute('..agency'))
    user = factory.SubFactory(UserFactory, agency=factory.SelfAttribute('..agency'), branch=factory.SelfAttribute('..branch'))
    action_type = factory.Iterator(['USER_LOGIN_SUCCESS', 'POLICY_CREATED', 'CLAIM_FILED'])
    details = factory.LazyAttribute(lambda o: {'message': f'Log for action: {o.action_type}'})
    ip_address = factory.Faker('ipv4')