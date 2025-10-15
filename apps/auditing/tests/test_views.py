# apps/auditing/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from .factories import SystemLogFactory
from ..models import SystemLog
from apps.accounts.tests.factories import UserFactory, AgencyFactory, AgencyAdminGroupFactory

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(reverse('token_obtain_pair'), {'email': user.email, 'password': 'password123'})
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data['access']

class TestSystemLogViewSet:
    def setup_method(self):
        self.client = APIClient()
        self.agency_a = AgencyFactory()
        self.agency_b = AgencyFactory()
        
        admin_group = AgencyAdminGroupFactory()
        permission = Permission.objects.get(
            codename='view_systemlog',
            content_type=ContentType.objects.get_for_model(SystemLog)
        )
        admin_group.permissions.add(permission)
        self.admin_a = UserFactory(agency=self.agency_a, groups=[admin_group])

        self.user_a_no_perms = UserFactory(agency=self.agency_a)
        
        self.superuser = UserFactory(is_superuser=True, agency=None)

        SystemLogFactory.create_batch(3, agency=self.agency_a)
        SystemLogFactory.create_batch(2, agency=self.agency_b)

    def test_superuser_can_list_all_logs(self):
        token = get_tokens_for_user(self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('audit-log-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 5

    def test_admin_can_list_only_their_agencys_logs(self):
        token = get_tokens_for_user(self.admin_a)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('audit-log-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3
        
        for log in response.data['results']:
            # +++ THE FIX: Cast the response value to a string before comparing +++
            assert str(log['agency']) == str(self.agency_a.id)

    def test_user_without_permission_sees_no_logs(self):
        token = get_tokens_for_user(self.user_a_no_perms)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(reverse('audit-log-list'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0