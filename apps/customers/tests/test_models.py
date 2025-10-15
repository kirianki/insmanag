# apps/customers/tests/test_models.py
import pytest
from django.db.models import ProtectedError
from ..models import Customer
from .factories import CustomerFactory
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

class TestCustomerModel:
    def test_customer_number_is_generated_on_save(self):
        customer = CustomerFactory(customer_number="") # Create with empty number
        assert customer.customer_number is not None
        assert customer.agency.agency_code in customer.customer_number
        
        # Verify it doesn't change on subsequent saves
        old_number = customer.customer_number
        customer.first_name = "Updated"
        customer.save()
        assert customer.customer_number == old_number

    def test_deleting_assigned_agent_is_protected(self):
        agent = UserFactory()
        CustomerFactory(assigned_agent=agent)
        
        with pytest.raises(ProtectedError):
            agent.delete()

        # The agent and customer should still exist
        assert Customer.objects.filter(assigned_agent=agent).exists()
        assert agent.__class__.objects.filter(id=agent.id).exists()