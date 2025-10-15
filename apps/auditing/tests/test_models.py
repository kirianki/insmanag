import pytest
from .factories import SystemLogFactory

# Mark all tests in this file as needing database access
pytestmark = pytest.mark.django_db

def test_system_log_creation():
    """
    Tests that a SystemLog entry can be created successfully.
    """
    log = SystemLogFactory(action_type="POLICY_CREATED")
    assert log.pk is not None
    assert log.action_type == "POLICY_CREATED"
    assert "message" in log.details
    assert log.agency is not None
