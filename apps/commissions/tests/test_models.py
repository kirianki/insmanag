import pytest
from decimal import Decimal
from .factories import (
    CustomerPaymentFactory, StaffCommissionFactory, PayoutBatchFactory,
)
from apps.commissions.models import ProviderCommissionStructure, StaffCommissionRule
from apps.policies.tests.factories import InsuranceProviderFactory, PolicyTypeFactory
from apps.accounts.tests.factories import UserFactory

# Mark all tests in this file as needing database access
pytestmark = pytest.mark.django_db

def test_customer_payment_creation():
    """
    Tests that a CustomerPayment can be created successfully and its
    string representation is correct.
    """
    payment = CustomerPaymentFactory(
        amount=Decimal("15000.50"),
        policy__policy_number="POL-TEST-001"
    )
    assert payment.pk is not None
    assert str(payment) == "Payment of 15000.50 for POL-TEST-001"
    assert payment.customer == payment.policy.customer

def test_provider_commission_structure_creation():
    """
    Tests the creation of a provider commission structure rule.
    """
    provider = InsuranceProviderFactory()
    policy_type = PolicyTypeFactory()
    structure = ProviderCommissionStructure.objects.create(
        provider=provider,
        policy_type=policy_type,
        commission_type=ProviderCommissionStructure.CommissionType.NEW_BUSINESS,
        rate_percentage=Decimal("15.00")
    )
    assert structure.pk is not None
    assert structure.rate_percentage == Decimal("15.00")

def test_staff_commission_rule_creation():
    """
    Tests the creation of a staff-specific commission rule.
    """
    user = UserFactory()
    rule = StaffCommissionRule.objects.create(
        user=user,
        payout_basis=StaffCommissionRule.PayoutBasis.TOTAL_PREMIUM,
        rate_percentage=Decimal("5.25")
    )
    assert rule.pk is not None
    assert rule.user == user
    assert rule.rate_percentage == Decimal("5.25")

def test_payout_batch_creation():
    """
    Tests that a PayoutBatch can be created successfully.
    """
    batch = PayoutBatchFactory()
    assert batch.pk is not None
    assert batch.agency is not None
    assert batch.initiated_by is not None
    assert batch.status == "PROCESSING"

def test_staff_commission_creation():
    """
    Tests the creation of a staff commission record and its default status.
    """
    commission = StaffCommissionFactory(commission_amount=Decimal("750.00"))
    assert commission.pk is not None
    assert commission.commission_amount == Decimal("750.00")
    # Verify the default status is correctly set
    assert commission.status == "PENDING_APPROVAL"
    assert commission.get_status_display() == "Pending Approval"
