# apps/communications/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from .factories import CommunicationFactory, NotificationFactory
from ..models import Communication, Notification
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgentGroupFactory, AgencyAdminGroupFactory

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data['access']

class TestCommunicationLogViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        
        # User with permission to view logs
        admin_group = AgencyAdminGroupFactory()
        permission = Permission.objects.get(
            codename='view_communication',
            content_type=ContentType.objects.get_for_model(Communication)
        )
        admin_group.permissions.add(permission)
        self.admin_user = UserFactory(agency=self.agency, groups=[admin_group])

        # User without permission
        self.agent_user = UserFactory(agency=self.agency, groups=[AgentGroupFactory()])

        # Create logs within the agency
        CommunicationFactory.create_batch(3, customer__agency=self.agency)
        # Create a log in another agency that should not be visible
        CommunicationFactory()

    def test_user_with_permission_can_list_logs(self):
        token = get_tokens_for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('communication-log-list'))

        assert response.status_code == status.HTTP_200_OK
        # Should only see the 3 logs from their own agency
        assert response.data['count'] == 3

    def test_user_without_permission_is_forbidden(self):
        token = get_tokens_for_user(self.agent_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('communication-log-list'))

        # Because we moved to a permission class, the expected status is 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN

class TestNotificationViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency = AgencyFactory()
        
        self.user_a = UserFactory(agency=self.agency)
        self.user_b = UserFactory(agency=self.agency)

        # Create notifications for both users
        NotificationFactory.create_batch(3, user=self.user_a, is_read=False)
        NotificationFactory(user=self.user_a, is_read=True) # One already read
        NotificationFactory.create_batch(2, user=self.user_b)

    def test_user_can_only_list_own_notifications(self):
        token = get_tokens_for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('notification-list'))

        assert response.status_code == status.HTTP_200_OK
        # User A has 4 notifications in total
        assert response.data['count'] == 4
        # Check that none of the returned notifications belong to User B
        for notification in response.data['results']:
            assert notification['id'] in [str(n.id) for n in self.user_a.notifications.all()]

    def test_user_can_mark_notification_as_read(self):
        unread_notification = self.user_a.notifications.filter(is_read=False).first()
        
        token = get_tokens_for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('notification-detail', kwargs={'pk': unread_notification.id})
        response = self.client.patch(url, {'is_read': True}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_read'] is True
        
        unread_notification.refresh_from_db()
        assert unread_notification.is_read is True

    def test_user_cannot_update_another_users_notification(self):
        notification_of_b = self.user_b.notifications.first()
        
        token = get_tokens_for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('notification-detail', kwargs={'pk': notification_of_b.id})
        response = self.client.patch(url, {'is_read': True}, format='json')

        # Should be a 404 because the queryset in get_queryset scopes it to the user
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_all_as_read_custom_action(self):
        # Verify initial state: User A has 3 unread notifications
        assert self.user_a.notifications.filter(is_read=False).count() == 3

        token = get_tokens_for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('notification-mark-all-as-read')
        response = self.client.post(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify final state: User A now has 0 unread notifications
        assert self.user_a.notifications.filter(is_read=False).count() == 0
        # Verify User B's notifications were not affected
        assert self.user_b.notifications.filter(is_read=False).count() == 2