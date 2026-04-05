# apps/customers/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from datetime import date, timedelta
from ..models import Customer, CustomerDocument
from apps.accounts.tests.factories import UserFactory, AgencyFactory

class CustomerFactory(DjangoModelFactory):
    class Meta:
        model = Customer

    agency = factory.SubFactory(AgencyFactory)
    
    # +++ THE FIX: Ensure the assigned_agent belongs to the same agency as the customer.
    # We pass the agency created for the customer down into the UserFactory.
    assigned_agent = factory.SubFactory(
        UserFactory,
        agency=factory.SelfAttribute('..agency') # '..' refers to the CustomerFactory's context
    )
    
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Faker('email')
    phone = factory.Faker('phone_number')
    id_number = factory.Faker('ssn')

class CustomerDocumentFactory(DjangoModelFactory):
    class Meta:
        model = CustomerDocument

    customer = factory.SubFactory(CustomerFactory)
    document_type = factory.Iterator(['National ID', 'KRA PIN', 'Passport'])
    file = factory.django.FileField(filename='dummy_doc.pdf')