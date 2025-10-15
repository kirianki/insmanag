# apps/customers/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from .factories import CustomerFactory
from apps.accounts.tests.factories import (
    UserFactory, AgencyFactory, AgencyBranchFactory,
    AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

# Helper to get JWT tokens
def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK
    return response.data['access']

class TestCustomerViewSetPermissions:
    def setup_method(self):
        self.client = APIClient()
        
        # Setup Agencies, Branches, and Roles
        self.agency = AgencyFactory()
        self.branch_a = AgencyBranchFactory(agency=self.agency)
        self.branch_b = AgencyBranchFactory(agency=self.agency)
        
        admin_group = AgencyAdminGroupFactory()
        manager_group = ManagerGroupFactory()
        agent_group = AgentGroupFactory()

        # Create Users
        self.admin = UserFactory(agency=self.agency, groups=[admin_group], without_branch=True)
        self.manager_a = UserFactory(agency=self.agency, branch=self.branch_a, groups=[manager_group])
        self.agent_a1 = UserFactory(agency=self.agency, branch=self.branch_a, groups=[agent_group])
        self.agent_b1 = UserFactory(agency=self.agency, branch=self.branch_b, groups=[agent_group])

        # Create Customers assigned to agents
        self.customer_a1 = CustomerFactory(assigned_agent=self.agent_a1, agency=self.agency)
        self.customer_b1 = CustomerFactory(assigned_agent=self.agent_b1, agency=self.agency)

    def test_agent_sees_only_their_own_customers(self):
        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('customer-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['id'] == str(self.customer_a1.id)

    def test_manager_sees_all_customers_in_their_branch(self):
        # Create another agent and customer in the same branch
        agent_a2 = UserFactory(agency=self.agency, branch=self.branch_a, groups=[AgentGroupFactory()])
        CustomerFactory(assigned_agent=agent_a2, agency=self.agency)
        
        token = get_tokens_for_user(self.manager_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('customer-list'))
        
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 2 # Sees customer_a1 and the new customer
        
        result_ids = {c['id'] for c in results}
        assert str(self.customer_b1.id) not in result_ids # Does not see customer from branch B

    def test_admin_sees_all_customers_in_agency(self):
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('customer-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2 # Sees customers from both branches

    def test_agent_can_create_customer(self):
        # We need to give the Agent group permission to add customers for this to pass
        from django.contrib.auth.models import Permission
        from django.contrib.contenttypes.models import ContentType
        from ..models import Customer
        customer_ct = ContentType.objects.get_for_model(Customer)
        add_customer_perm = Permission.objects.get(codename='add_customer', content_type=customer_ct)
        self.agent_a1.groups.first().permissions.add(add_customer_perm)

        token = get_tokens_for_user(self.agent_a1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        customer_data = {'first_name': 'New', 'last_name': 'Client', 'phone': '12345'}
        response = self.client.post(reverse('customer-list'), customer_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        new_customer = Customer.objects.get(id=response.data['id'])
        assert new_customer.assigned_agent == self.agent_a1
        assert new_customer.agency == self.agent_a1.agency
        assert new_customer.customer_number is not None # Check number was generated