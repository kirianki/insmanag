# apps/auditing/tests/test_tasks.py
import pytest
from ..tasks import create_system_log
from ..models import SystemLog
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

def test_create_system_log_task():
    """
    Tests that the Celery task successfully creates a SystemLog object.
    """
    user = UserFactory()
    log_data = {
        "agency_id": user.agency_id,
        "branch_id": user.branch_id,
        "user_id": user.id,
        "action_type": "TEST_ACTION",
        "details": {"message": "This is a test log entry."},
        "ip_address": "192.168.1.1"
    }
    
    # Run the task synchronously for testing
    create_system_log(log_data)
    
    assert SystemLog.objects.count() == 1
    
    log_entry = SystemLog.objects.first()
    assert log_entry.agency_id == user.agency_id
    assert log_entry.user == user
    assert log_entry.action_type == "TEST_ACTION"
    assert log_entry.details['message'] == "This is a test log entry."
    assert log_entry.ip_address == "192.168.1.1"