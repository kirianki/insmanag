# apps/policies/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from .factories import PolicyFactory, PolicyTypeFactory
from apps.accounts.tests.factories import (
    UserFactory, AgencyFactory, AgencyBranchFactory,
    AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory
)
from apps.customers.tests.factories import CustomerFactory
from ..models import Policy

pytestmark = pytest.mark.django_db

# Helper to get JWT tokens
def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK
    return response.data['access']

class TestPolicyViewSetPermissions:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.branch_a = AgencyBranchFactory(agency=self.agency)
        self.branch_b = AgencyBranchFactory(agency=self.agency)
        
        # Create user roles with necessary permissions
        self.admin_group = AgencyAdminGroupFactory()
        self.manager_group = ManagerGroupFactory()
        self.agent_group = AgentGroupFactory()
        
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        policy_ct = ContentType.objects.get_for_model(Policy)
        view_policy_perm = Permission.objects.get(codename='view_policy', content_type=policy_ct)
        add_policy_perm = Permission.objects.get(codename='add_policy', content_type=policy_ct)
        change_policy_perm = Permission.objects.get(codename='change_policy', content_type=policy_ct)

        self.admin_group.permissions.add(view_policy_perm, add_policy_perm, change_policy_perm)
        self.manager_group.permissions.add(view_policy_perm, add_policy_perm, change_policy_perm)
        self.agent_group.permissions.add(add_policy_perm, change_policy_perm) # Agents can add/change but not view all

        # Create Users
        self.admin = UserFactory(agency=self.agency, groups=[self.admin_group], without_branch=True)
        self.manager_a = UserFactory(agency=self.agency, branch=self.branch_a, groups=[self.manager_group])
        self.agent_a1 = UserFactory(agency=self.agency, branch=self.branch_a, groups=[self.agent_group])
        self.agent_b1 = UserFactory(agency=self.agency, branch=self.branch_b, groups=[self.agent_group])

        # Create policies assigned to agents
        self.policy_a1 = PolicyFactory(agent=self.agent_a1, customer__agency=self.agency)
        self.policy_b1 = PolicyFactory(agent=self.agent_b1, customer__agency=self.agency)

    def test_agent_sees_only_their_own_policies(self):
        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('policy-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['id'] == str(self.policy_a1.id)

    def test_manager_sees_all_policies_in_their_branch(self):
        token = get_tokens_for_user(self.manager_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('policy-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        result_ids = {p['id'] for p in results}
        assert str(self.policy_a1.id) in result_ids
        assert str(self.policy_b1.id) not in result_ids # Does not see policy from branch B

    def test_admin_sees_all_policies_in_agency(self):
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('policy-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_activate_policy_success(self):
        self.policy_a1.status = Policy.Status.PAID_PENDING_ACTIVATION
        self.policy_a1.save()
        
        token = get_tokens_for_user(self.admin) # Admin can activate
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('policy-activate', kwargs={'pk': self.policy_a1.id})
        data = {'insurance_certificate_number': 'CERT12345'}
        response = self.client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == Policy.Status.ACTIVE
        assert response.data['insurance_certificate_number'] == 'CERT12345'
        
        self.policy_a1.refresh_from_db()
        assert self.policy_a1.status == Policy.Status.ACTIVE

    def test_activate_policy_wrong_status_fails(self):
        # Policy is AWAITING_PAYMENT, should fail
        assert self.policy_a1.status == Policy.Status.AWAITING_PAYMENT
        
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('policy-activate', kwargs={'pk': self.policy_a1.id})
        data = {'insurance_certificate_number': 'CERT12345'}
        response = self.client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        self.policy_a1.refresh_from_db()
        assert self.policy_a1.status == Policy.Status.AWAITING_PAYMENT

    def test_policy_creation_generates_policy_number(self):
        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        customer = CustomerFactory(assigned_agent=self.agent_a1, agency=self.agency)
        policy_type = PolicyTypeFactory(agency=self.agency)
        
        policy_data = {
            "customer": customer.id,
            "agent": self.agent_a1.id,
            "provider": self.policy_a1.provider.id,
            "policy_type": policy_type.id,
            "premium_amount": "50000.00",
            "policy_start_date": "2025-10-01",
            "policy_end_date": "2026-09-30"
        }
        response = self.client.post(reverse('policy-list'), policy_data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['policy_number'].startswith('POL-')
        assert response.data['status'] == Policy.Status.AWAITING_PAYMENT