# apps/analytics/tests/test_views.py
import pytest
from decimal import Decimal
from datetime import date, timedelta, datetime
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse

from apps.policies.tests.factories import PolicyFactory
from apps.commissions.tests.factories import StaffCommissionFactory
from apps.commissions.models import StaffCommission
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgencyAdminGroupFactory, AgentGroupFactory
from apps.customers.tests.factories import CustomerFactory 
from apps.customers.models import Customer 

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data['access']

class TestDashboardAnalyticsView:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.admin = UserFactory(agency=self.agency, groups=[AgencyAdminGroupFactory()])
        self.agent = UserFactory(agency=self.agency, groups=[AgentGroupFactory()])
        # --- FIX: Remove data creation from setup to isolate tests ---

    def test_access_denied_for_user_without_permission(self):
        token = get_tokens_for_user(self.agent)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('dashboard-summary'))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_access_granted_for_user_with_permission(self):
        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('dashboard-summary'))
        assert response.status_code == status.HTTP_200_OK

    def test_dashboard_returns_correct_agency_wide_totals(self):
        # Create data specifically for this test
        PolicyFactory(customer__agency=self.agency, premium_amount=1000)
        PolicyFactory(customer__agency=self.agency, premium_amount=2000)
        PolicyFactory() # Belongs to another agency, should be ignored

        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('dashboard-summary'))
        
        assert response.status_code == status.HTTP_200_OK
        summary = response.data['summary']
        assert summary['policies_sold_count'] == 2
        assert Decimal(summary['total_premium_collected']) == Decimal("3000.00")

    def test_dashboard_filters_by_agent_id(self):
        agent_b = UserFactory(agency=self.agency)
        # Create a policy explicitly for agent_b in the correct agency
        PolicyFactory(
            agent=agent_b,
            customer__assigned_agent=agent_b,
            customer__agency=self.agency,
            premium_amount=5000
        )
        # Create another policy not for agent_b to ensure filter works
        PolicyFactory(customer__agency=self.agency, premium_amount=1000)

        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = f"{reverse('dashboard-summary')}?agent_id={agent_b.id}"
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        summary = response.data['summary']
        assert summary['policies_sold_count'] == 1
        assert Decimal(summary['total_premium_collected']) == Decimal("5000.00")

    def test_dashboard_filters_by_date_range(self):
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        # Create one explicit customer in this agency with a known agent
        customer = Customer.objects.create(
            agency=self.agency,
            assigned_agent=self.agent,
            first_name="Test",
            last_name="Customer",
            email="customer@example.com",
            phone="1234567890",
            id_number="12345678"
        )

        # Create policies only for that customer
        PolicyFactory(
            customer=customer, agent=self.agent, premium_amount=1000,
            created_at=timezone.make_aware(datetime.combine(today, datetime.min.time()))
        )
        PolicyFactory(
            customer=customer, agent=self.agent, premium_amount=2000,
            created_at=timezone.make_aware(datetime.combine(today, datetime.min.time()))
        )
        PolicyFactory(
            customer=customer, agent=self.agent, premium_amount=1,
            created_at=timezone.make_aware(datetime.combine(yesterday, datetime.min.time()))
        )

        token = get_tokens_for_user(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        url = f"{reverse('dashboard-summary')}?date_from={today.strftime('%Y-%m-%d')}"
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        summary = response.data['summary']
        assert summary['policies_sold_count'] == 2
        assert Decimal(summary['total_premium_collected']) == Decimal("3000.00")

class TestAgentAnalyticsView:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        self.agent_a = UserFactory(agency=self.agency)
        self.agent_b = UserFactory(agency=self.agency)

        # Data for Agent A
        policy_a1 = PolicyFactory(agent=self.agent_a, premium_amount=100)
        StaffCommissionFactory(policy=policy_a1, agent=self.agent_a, commission_amount=10, status=StaffCommission.Status.APPROVED)
        
        policy_a2 = PolicyFactory(agent=self.agent_a, premium_amount=200)
        StaffCommissionFactory(policy=policy_a2, agent=self.agent_a, commission_amount=20, status=StaffCommission.Status.PENDING_APPROVAL)
        
        # Data for Agent B (should be ignored)
        PolicyFactory(agent=self.agent_b, premium_amount=1000)

    def test_agent_can_access_personal_analytics(self):
        token = get_tokens_for_user(self.agent_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('agent-analytics'))
        assert response.status_code == status.HTTP_200_OK

    def test_agent_sees_only_their_own_data(self):
        token = get_tokens_for_user(self.agent_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('agent-analytics'))

        assert response.status_code == status.HTTP_200_OK
        summary = response.data['personal_summary']
        
        assert summary['policies_sold_count'] == 2
        assert Decimal(summary['total_premium_sold']) == Decimal("300.00")
        assert Decimal(summary['commission_approved']) == Decimal("10.00")
        assert Decimal(summary['commission_pending_approval']) == Decimal("20.00")