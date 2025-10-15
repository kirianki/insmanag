# apps/claims/tests/test_serializers.py
import pytest
from datetime import date, timedelta
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from ..serializers import ClaimSerializer
# We will use our own factories, not the claim factory for this test
from apps.customers.tests.factories import CustomerFactory
from apps.policies.tests.factories import PolicyFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory

pytestmark = pytest.mark.django_db

class TestClaimSerializer:
    def setup_method(self):
        self.factory = APIRequestFactory()
        # +++ THE FIX: Create a single agency and user to be shared across tests +++
        self.agency = AgencyFactory()
        self.agent = UserFactory(agency=self.agency)
        self.request = self.factory.post('/claims/')
        self.request.user = self.agent

    def test_claimant_must_match_policy_customer(self):
        # Create a policy and customer belonging to our test agent's agency
        policy = PolicyFactory(agent=self.agent, customer__agency=self.agency)
        # Create another customer within the same agency
        other_customer = CustomerFactory(agency=self.agency)
    
        data = {
            'policy': policy.pk,
            'claimant': other_customer.pk,
            'date_of_loss': policy.policy_start_date,
            'loss_description': 'Test'
        }
    
        serializer = ClaimSerializer(data=data, context={'request': self.request})
        # Now the PKs will be found, and our custom validation will run
        with pytest.raises(ValidationError, match="The claimant must be the customer on the selected policy."):
            serializer.is_valid(raise_exception=True)

    def test_date_of_loss_must_be_within_policy_period(self):
        # Create a policy belonging to our test agent's agency
        policy = PolicyFactory(agent=self.agent, customer__agency=self.agency)
        invalid_date = policy.policy_start_date - timedelta(days=1)
    
        data = {
            'policy': policy.pk,
            'claimant': policy.customer.pk,
            'date_of_loss': invalid_date,
            'loss_description': 'Test'
        }
    
        serializer = ClaimSerializer(data=data, context={'request': self.request})
        with pytest.raises(ValidationError, match="The date of loss must be within the policy's coverage period."):
            serializer.is_valid(raise_exception=True)

    def test_date_of_loss_cannot_be_in_future(self):
        # Create a policy belonging to our test agent's agency
        policy = PolicyFactory(agent=self.agent, customer__agency=self.agency)
        future_date = date.today() + timedelta(days=1)
        
        data = {
            'policy': policy.pk,
            'claimant': policy.customer.pk,
            'date_of_loss': future_date,
            'loss_description': 'Test'
        }
    
        serializer = ClaimSerializer(data=data, context={'request': self.request})
        with pytest.raises(ValidationError, match="The date of loss cannot be in the future."):
            serializer.is_valid(raise_exception=True)

    def test_valid_claim_data_is_valid(self):
        # Create a policy belonging to our test agent's agency
        policy = PolicyFactory(agent=self.agent, customer__agency=self.agency)
        data = {
            'policy': policy.pk,
            'claimant': policy.customer.pk,
            'date_of_loss': policy.policy_start_date,
            'loss_description': 'A valid claim.'
        }
        serializer = ClaimSerializer(data=data, context={'request': self.request})
        assert serializer.is_valid(raise_exception=True)