# apps/auditing/tests/test_signals.py
import pytest
from unittest.mock import patch
from django.contrib.auth.signals import user_logged_in
from apps.accounts.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

@patch('apps.auditing.signals.create_system_log.delay')
class TestAuditSignals:
    
    def test_user_logged_in_signal_triggers_log_task(self, mock_delay):
        """
        Verify that the user_logged_in signal triggers the create_system_log task.
        """
        user = UserFactory()
        
        # Django's test client doesn't automatically fire the user_logged_in signal
        # when using force_login or client.login(). It's best to fire it manually
        # to unit test the signal handler's logic.
        class MockRequest:
            META = {'REMOTE_ADDR': '127.0.0.1'}
        
        user_logged_in.send(sender=user.__class__, request=MockRequest(), user=user)
        
        # Assert that our Celery task was called once
        mock_delay.assert_called_once()
        
        # Inspect the data that was passed to the task
        log_data = mock_delay.call_args[0][0]
        assert log_data['agency_id'] == user.agency_id
        assert log_data['user_id'] == user.id
        assert log_data['action_type'] == "USER_LOGIN_SUCCESS"
        assert log_data['details']['email'] == user.email
        assert log_data['ip_address'] == '127.0.0.1'

    def test_user_login_does_not_log_for_user_without_agency(self, mock_delay):
        """
        Verify that logins for users without an agency (like superusers) are not logged.
        """
        superuser = UserFactory(is_superuser=True, agency=None)
        
        class MockRequest:
            META = {'REMOTE_ADDR': '127.0.0.1'}
            
        user_logged_in.send(sender=superuser.__class__, request=MockRequest(), user=superuser)
        
        # Assert that the task was NOT called
        mock_delay.assert_not_called()