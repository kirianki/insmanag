# apps/claims/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from ..models import Claim
from .factories import ClaimFactory
from apps.accounts.tests.factories import (
    UserFactory, AgencyFactory, AgencyBranchFactory,
    AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data['access']

class TestClaimViewSetPermissions:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.branch_a = AgencyBranchFactory(agency=self.agency)
        self.branch_b = AgencyBranchFactory(agency=self.agency)
        
        # Create users with appropriate roles
        self.admin = UserFactory(agency=self.agency, groups=[AgencyAdminGroupFactory()], without_branch=True)
        self.manager_a = UserFactory(agency=self.agency, branch=self.branch_a, groups=[ManagerGroupFactory()])
        self.agent_a1 = UserFactory(agency=self.agency, branch=self.branch_a, groups=[AgentGroupFactory()])
        self.agent_b1 = UserFactory(agency=self.agency, branch=self.branch_b, groups=[AgentGroupFactory()])

        # Create claims via policies sold by agents
        self.claim_a1 = ClaimFactory(policy__agent=self.agent_a1, policy__customer__agency=self.agency)
        self.claim_b1 = ClaimFactory(policy__agent=self.agent_b1, policy__customer__agency=self.agency)

    def test_agent_sees_only_their_own_claims(self):
        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('claim-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['id'] == str(self.claim_a1.id)

    def test_manager_sees_all_claims_in_their_branch(self):
        token = get_tokens_for_user(self.manager_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('claim-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        result_ids = {c['id'] for c in results}
        assert str(self.claim_a1.id) in result_ids
        assert str(self.claim_b1.id) not in result_ids

    def test_admin_sees_all_claims_in_agency(self):
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('claim-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_agent_can_create_claim(self):
        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        policy = self.claim_a1.policy
        claim_data = {
            'policy': policy.pk,
            'claimant': policy.customer.pk,
            'date_of_loss': policy.policy_start_date,
            'loss_description': 'The car was scratched in the parking lot.'
        }
        
        response = self.client.post(reverse('claim-list'), claim_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        new_claim = Claim.objects.get(id=response.data['id'])
        assert new_claim.reported_by == self.agent_a1
        assert new_claim.claim_number is not None