import pytest
from .factories import InsuranceProviderFactory, PolicyTypeFactory, PolicyFactory
from apps.policies.models import Policy

# Mark all tests in this file as needing database access
pytestmark = pytest.mark.django_db

def test_insurance_provider_creation():
    """
    Tests that an InsuranceProvider can be created successfully.
    """
    provider = InsuranceProviderFactory(name="Alliance Insurance")
    assert provider.pk is not None
    assert str(provider) == "Alliance Insurance"
    assert provider.is_active is True

def test_policy_type_creation():
    """
    Tests that a PolicyType can be created and is correctly linked to an agency.
    """
    policy_type = PolicyTypeFactory(name="Comprehensive Motor")
    assert policy_type.pk is not None
    assert str(policy_type) == "Comprehensive Motor"
    assert policy_type.agency is not None

def test_policy_creation():
    """
    Tests the successful creation of a Policy instance with all its relationships.
    """
    policy = PolicyFactory(policy_number="POL-XYZ-001")
    assert policy.pk is not None
    assert str(policy) == "POL-XYZ-001"
    assert policy.status == Policy.Status.AWAITING_PAYMENT
    
    # Verify that all foreign key relationships were established correctly
    assert policy.customer is not None
    assert policy.agent is not None
    assert policy.provider is not None
    assert policy.policy_type is not None
    
    # Check that agency consistency is maintained through the factories
    assert policy.customer.agency == policy.agent.agency
    assert policy.customer.agency == policy.policy_type.agency

def test_policy_status_choices():
    """
    Ensures that the policy status field uses the correct choices from the enum.
    """
    policy = PolicyFactory()
    # The `get_status_display()` method will return the human-readable value
    assert policy.get_status_display() == "Awaiting Payment"
    
    policy.status = Policy.Status.ACTIVE
    policy.save()
    assert policy.get_status_display() == "Active"
