# apps/accounts/tests/test_views.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.urls import reverse

from apps.accounts.models import AgencyBranch, User
from apps.accounts.tests.factories import (
    AgencyFactory, AgencyBranchFactory, UserFactory,
    AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

def get_tokens_for_user(user):
    client = APIClient()
    response = client.post(
        reverse('token_obtain_pair'),
        {'email': user.email, 'password': 'password123'},
        format='json'
    )
    assert response.status_code == status.HTTP_200_OK, response.data
    return response.data

class TestAuthEndpoints:
    def setup_method(self):
        self.user = UserFactory(password='password123')
        self.client = APIClient()

    def test_obtain_token(self):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'email': self.user.email, 'password': 'password123'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_refresh_token(self):
        token_data = get_tokens_for_user(self.user)
        response = self.client.post(
            reverse('token_refresh'),
            {'refresh': token_data['refresh']},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_change_password_valid(self):
        token_data = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.post(
            reverse('auth-change-password'),
            {'old_password': 'password123', 'new_password': 'newstrongpassword!23'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.check_password('newstrongpassword!23')

class TestAgencyViewSet:
    def setup_method(self):
        self.agency1 = AgencyFactory()
        self.agency2 = AgencyFactory()
        admin_group = AgencyAdminGroupFactory()
        self.admin_agency1 = UserFactory(agency=self.agency1, password='password123', groups=[admin_group])
        self.client = APIClient()

    def test_admin_can_view_own_agency(self):
        token_data = get_tokens_for_user(self.admin_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('agency-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(self.agency1.id)

    def test_superuser_can_view_all_agencies(self):
        superuser = UserFactory(is_superuser=True, password='password123', agency=None)
        token_data = get_tokens_for_user(superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('agency-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

class TestAgencyBranchViewSet:
    def setup_method(self):
        self.agency1 = AgencyFactory()
        # FIX: Use the 'without_branch' trait to prevent creating an extra branch
        self.admin_agency1 = UserFactory(
            agency=self.agency1,
            password='password123',
            groups=[AgencyAdminGroupFactory()],
            without_branch=True
        )
        AgencyBranchFactory.create_batch(2, agency=self.agency1)
        self.client = APIClient()

    def test_admin_can_list_own_agency_branches(self):
        token_data = get_tokens_for_user(self.admin_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('branch-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_admin_can_create_branch_for_own_agency(self):
        token_data = get_tokens_for_user(self.admin_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        data = {'branch_name': 'New Branch A1', 'city': 'Nairobi'}
        response = self.client.post(reverse('branch-list'), data)
        assert response.status_code == status.HTTP_201_CREATED
        assert AgencyBranch.objects.filter(branch_name='New Branch A1', agency=self.agency1).exists()

class TestUserViewSet:
    def setup_method(self):
        self.agency1 = AgencyFactory()
        self.agency2 = AgencyFactory()
        admin_group = AgencyAdminGroupFactory()
        manager_group = ManagerGroupFactory()
        agent_group = AgentGroupFactory()
        self.admin_agency1 = UserFactory(agency=self.agency1, password='password123', groups=[admin_group])
        self.manager_agency1 = UserFactory(agency=self.agency1, password='password123', groups=[manager_group])
        self.agent_agency1 = UserFactory(agency=self.agency1, password='password123', groups=[agent_group])
        self.user_agency2 = UserFactory(agency=self.agency2, password='password123')
        self.client = APIClient()

    def test_admin_can_list_all_users_in_own_agency(self):
        token_data = get_tokens_for_user(self.admin_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('user-list'))
        assert response.status_code == status.HTTP_200_OK
        expected_ids = {str(self.admin_agency1.id), str(self.manager_agency1.id), str(self.agent_agency1.id)}
        response_ids = {u['id'] for u in response.data['results']}
        assert response_ids == expected_ids

    def test_agent_can_only_list_self(self):
        token_data = get_tokens_for_user(self.agent_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('user-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == str(self.agent_agency1.id)

    def test_agent_can_retrieve_self_only(self):
        token_data = get_tokens_for_user(self.agent_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        response = self.client.get(reverse('user-detail', kwargs={'pk': self.agent_agency1.id}))
        assert response.status_code == status.HTTP_200_OK

        response = self.client.get(reverse('user-detail', kwargs={'pk': self.admin_agency1.id}))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_can_update_user_in_own_agency(self):
        token_data = get_tokens_for_user(self.admin_agency1)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
        data = {'first_name': 'UpdatedName'}
        response = self.client.patch(reverse('user-detail', kwargs={'pk': self.manager_agency1.id}), data)
        assert response.status_code == status.HTTP_200_OK
        self.manager_agency1.refresh_from_db()
        assert self.manager_agency1.first_name == 'UpdatedName'

    def test_superuser_can_create_user_for_any_agency(self):
        superuser = UserFactory(is_superuser=True, password='password123', agency=None)
        token_data = get_tokens_for_user(superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_data["access"]}')
    
        branch_for_agency2 = AgencyBranchFactory(agency=self.agency2)
        new_user_data = {
            'email': 'supercreated@agency2.com',
            'first_name': 'Super',
            'last_name': 'User',
            'password': 'SuperStrongPass123!',
            'agency': str(self.agency2.id),
            'branch': str(branch_for_agency2.id),
        }
        response = self.client.post(reverse('user-list'), new_user_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.get(email='supercreated@agency2.com').agency == self.agency2