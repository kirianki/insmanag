# apps/customers/tests/test_serializers.py
import pytest
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from ..serializers import ProspectSerializer
from .factories import CustomerFactory
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

class TestProspectSerializer:
    def test_cannot_create_prospect_for_another_agents_customer(self):
        agent_a = UserFactory()
        agent_b = UserFactory()
        customer_of_agent_a = CustomerFactory(assigned_agent=agent_a)
        
        # Simulate a request coming from agent_b
        factory = APIRequestFactory()
        request = factory.post('/prospects/')
        request.user = agent_b
        
        prospect_data = {
            'customer': customer_of_agent_a.id,
            'current_insurer': 'Some Insurer',
            'policy_type_description': 'Motor',
            'renewal_date': '2025-12-01'
        }
        
        serializer = ProspectSerializer(data=prospect_data, context={'request': request})
        
        assert not serializer.is_valid()
        with pytest.raises(ValidationError) as excinfo:
            serializer.is_valid(raise_exception=True)
        
        assert "You can only create prospects for your own customers." in str(excinfo.value)