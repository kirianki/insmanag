# apps/commissions/tests/test_tasks.py
import pytest
from unittest.mock import patch
from ..tasks import process_c2b_payment
from ..models import CustomerPayment
from apps.policies.models import Policy
from apps.policies.tests.factories import PolicyFactory

pytestmark = pytest.mark.django_db

@patch('apps.commissions.tasks.Notification.objects.create')
class TestProcessC2BPaymentTask:
    def test_success_case(self, mock_notification_create):
        policy = PolicyFactory(status=Policy.Status.AWAITING_PAYMENT, premium_amount="5000.00")
        payload = {
            'TransID': 'ABC123XYZ',
            'TransAmount': '5000.00',
            'BillRefNumber': policy.policy_number,
        }
        
        process_c2b_payment(payload)
        
        policy.refresh_from_db()
        assert policy.status == Policy.Status.PAID_PENDING_ACTIVATION
        assert CustomerPayment.objects.filter(mpesa_reference='ABC123XYZ').exists()
        mock_notification_create.assert_called_once()

    def test_idempotency_duplicate_transaction(self, mock_notification_create):
        policy = PolicyFactory(status=Policy.Status.AWAITING_PAYMENT)
        payload = {'TransID': 'DEF456', 'TransAmount': str(policy.premium_amount), 'BillRefNumber': policy.policy_number}
        
        # Process once successfully
        process_c2b_payment(payload)
        assert CustomerPayment.objects.count() == 1
        
        # Process a second time
        process_c2b_payment(payload)
        assert CustomerPayment.objects.count() == 1 # Should not create a duplicate
        mock_notification_create.assert_called_once() # Notification not sent again

    def test_policy_not_awaiting_payment(self, mock_notification_create):
        policy = PolicyFactory(status=Policy.Status.ACTIVE)
        payload = {'TransID': 'GHI789', 'TransAmount': str(policy.premium_amount), 'BillRefNumber': policy.policy_number}

        process_c2b_payment(payload)
        
        assert CustomerPayment.objects.count() == 0
        policy.refresh_from_db()
        assert policy.status == Policy.Status.ACTIVE # Status unchanged
        mock_notification_create.assert_not_called()

    def test_amount_mismatch(self, mock_notification_create):
        policy = PolicyFactory(status=Policy.Status.AWAITING_PAYMENT, premium_amount="1000.00")
        payload = {'TransID': 'JKL012', 'TransAmount': '900.00', 'BillRefNumber': policy.policy_number}

        process_c2b_payment(payload)
        
        assert CustomerPayment.objects.count() == 0
        policy.refresh_from_db()
        assert policy.status == Policy.Status.AWAITING_PAYMENT # Status unchanged
        mock_notification_create.assert_not_called()