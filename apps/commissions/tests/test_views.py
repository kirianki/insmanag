# apps/commissions/tests/test_views.py
import pytest
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from ..models import StaffCommission
from .factories import StaffCommissionFactory
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory # Import AgentGroupFactory
from apps.policies.tests.factories import PolicyFactory
from apps.policies.models import Policy

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data['access']

class TestStaffCommissionViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        
        manager_group = ManagerGroupFactory()
        agent_group = AgentGroupFactory() # Create the agent group
        
        # Ensure the manager's group has the permission
        permission = Permission.objects.get(
            codename='can_approve_commission',
            content_type=ContentType.objects.get_for_model(StaffCommission)
        )
        manager_group.permissions.add(permission)
        
        self.admin = UserFactory(agency=self.agency, groups=[AgencyAdminGroupFactory()])
        self.manager = UserFactory(agency=self.agency, groups=[manager_group])
        
        # +++ THE FIX: Create an agent explicitly and assign them to the Agent group +++
        self.agent = UserFactory(agency=self.agency, groups=[agent_group])
        self.commission = StaffCommissionFactory(agent=self.agent, status=StaffCommission.Status.PENDING_APPROVAL)

    def test_manager_can_approve_commission(self):
        token = get_tokens_for_user(self.manager)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('staff-commission-approve', kwargs={'pk': self.commission.id})
        response = self.client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        self.commission.refresh_from_db()
        assert self.commission.status == StaffCommission.Status.APPROVED

    def test_agent_cannot_approve_commission(self):
        # The agent for the commission is now self.agent
        token = get_tokens_for_user(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('staff-commission-approve', kwargs={'pk': self.commission.id})
        response = self.client.post(url)
        
        # This will fail because the AgentGroupFactory does not grant this permission
        assert response.status_code == status.HTTP_403_FORBIDDEN

class TestPayoutBatchViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.admin = UserFactory(agency=self.agency, groups=[AgencyAdminGroupFactory()])
        StaffCommissionFactory.create_batch(
            3, agent__agency=self.agency, status=StaffCommission.Status.APPROVED, commission_amount=100
        )

    def test_admin_can_create_payout_batch(self):
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post(reverse('payout-batch-list'))
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['commissions_count'] == 3
        assert response.data['total_amount'] == '300.00'
        assert StaffCommission.objects.filter(agent__agency=self.agency, status=StaffCommission.Status.BATCHED).count() == 3

    def test_create_batch_fails_with_no_approved_commissions(self):
        StaffCommission.objects.update(status=StaffCommission.Status.PENDING_APPROVAL)
        
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post(reverse('payout-batch-list'))
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "No approved commissions available to batch" in response.data['detail']

@patch('apps.commissions.views.process_c2b_payment.delay')
class TestSimulatePaymentViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.admin = UserFactory(agency=self.agency, groups=[AgencyAdminGroupFactory()])
        self.policy = PolicyFactory(customer__agency=self.agency, status=Policy.Status.AWAITING_PAYMENT)
        self.token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_simulate_payment_success(self, mock_delay):
        url = reverse('simulate-payment-list')
        data = {'policy_id': str(self.policy.id)}
        response = self.client.post(url, data)
        
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['message'] == "Payment simulation task has been queued."
        
        mock_delay.assert_called_once()
        payload = mock_delay.call_args[0][0]
        assert payload['BillRefNumber'] == self.policy.policy_number
        assert payload['TransAmount'] == str(self.policy.premium_amount)

    def test_simulate_payment_fails_for_active_policy(self, mock_delay):
        self.policy.status = Policy.Status.ACTIVE
        self.policy.save()
        
        url = reverse('simulate-payment-list')
        data = {'policy_id': str(self.policy.id)}
        response = self.client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        mock_delay.assert_not_called()