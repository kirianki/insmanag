# apps/auditing/tests/test_audit_logging.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from ..models import SystemLog
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgencyAdminGroupFactory
from apps.policies.tests.factories import PolicyFactory, InsuranceProviderFactory, PolicyTypeFactory
from apps.customers.tests.factories import CustomerFactory

pytestmark = pytest.mark.django_db

@pytest.fixture(autouse=True)
def override_test_settings(settings):
    settings.FORCE_SCRIPT_NAME = None
    settings.CELERY_TASK_ALWAYS_EAGER = True

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def agency_admin():
    agency = AgencyFactory()
    admin_group = AgencyAdminGroupFactory()
    user = UserFactory(agency=agency, groups=[admin_group])
    user.set_password('password123')
    user.save()
    return user

def test_login_audit_logging(api_client, agency_admin):
    """Verifies that a successful login triggers a USER_LOGIN_SUCCESS log."""
    url = '/api/v1/accounts/auth/token/'
    response = api_client.post(url, {'email': agency_admin.email, 'password': 'password123'})
    
    assert response.status_code == status.HTTP_200_OK
    
    log = SystemLog.objects.filter(action_type='USER_LOGIN_SUCCESS', user=agency_admin).first()
    assert log is not None
    assert log.details['email'] == agency_admin.email

def test_policy_creation_audit_logging(api_client, agency_admin):
    """Verifies that creating a policy triggers a POLICY_CREATED log."""
    api_client.force_authenticate(user=agency_admin)
    
    provider = InsuranceProviderFactory()
    policy_type = PolicyTypeFactory(agency=agency_admin.agency)
    customer = CustomerFactory(agency=agency_admin.agency)
    
    url = '/api/v1/policies/'
    data = {
        'customer': customer.id,
        'provider': provider.id,
        'policy_type': policy_type.id,
        'premium_amount': '5000.00',
        'policy_start_date': '2026-01-01',
        'policy_end_date': '2027-01-01',
        'vehicle_registration_number': 'KAA 123A'
    }
    
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_201_CREATED
    
    log = SystemLog.objects.filter(action_type='POLICY_CREATED', agency=agency_admin.agency).first()
    assert log is not None
    assert log.user == agency_admin
    assert log.details['vehicle_registration_number'] == 'KAA 123A'

def test_customer_creation_audit_logging(api_client, agency_admin):
    """Verifies that creating a customer triggers a CUSTOMER_CREATED log."""
    api_client.force_authenticate(user=agency_admin)
    
    url = '/api/v1/customers/'
    data = {
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@example.com',
        'phone': '+254712345678',
        'identification_number': '12345678',
        'customer_type': 'INDIVIDUAL'
    }
    
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_201_CREATED
    
    log = SystemLog.objects.filter(action_type='CUSTOMER_CREATED', agency=agency_admin.agency).first()
    assert log is not None
    assert log.user == agency_admin
    assert log.details['email'] == 'john.doe@example.com'
