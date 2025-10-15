# apps/communications/tests/factories.py
import factory
from factory.django import DjangoModelFactory

from ..models import Communication, Notification
from apps.customers.tests.factories import CustomerFactory
from apps.policies.tests.factories import PolicyFactory
from apps.accounts.tests.factories import UserFactory

class CommunicationFactory(DjangoModelFactory):
    class Meta:
        model = Communication

    customer = factory.SubFactory(CustomerFactory)
    policy = factory.SubFactory(PolicyFactory, customer=factory.SelfAttribute('..customer'))
    communication_type = "SMS"
    purpose = "Renewal Reminder"
    status = Communication.Status.SENT

class NotificationFactory(DjangoModelFactory):
    class Meta:
        model = Notification

    user = factory.SubFactory(UserFactory)
    policy = factory.SubFactory(PolicyFactory, agent=factory.SelfAttribute('..user'))
    message = factory.Faker('sentence', nb_words=8)
    is_read = False