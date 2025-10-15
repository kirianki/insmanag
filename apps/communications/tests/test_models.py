# apps/communications/tests/test_models.py
import pytest
from .factories import CommunicationFactory, NotificationFactory # <-- FIX: Corrected import name

pytestmark = pytest.mark.django_db

def test_communication_creation():
    """Tests the creation of a Communication log."""
    comm = CommunicationFactory()
    assert comm.pk is not None
    assert comm.customer is not None
    assert comm.status == "SENT"

def test_notification_creation():
    """Tests the creation of a Notification."""
    notification = NotificationFactory(is_read=False)
    assert notification.pk is not None
    assert notification.user is not None
    assert notification.is_read is False
    assert "For" in str(notification)