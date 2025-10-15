# apps/accounts/tests/test_permissions.py
import pytest
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser, Permission
from django.contrib.contenttypes.models import ContentType

from apps.accounts.permissions import IsAgencyAdmin, CanManageUsers
from apps.accounts.tests.factories import (
    UserFactory, AgencyFactory,
    AgencyAdminGroupFactory, ManagerGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

class TestIsAgencyAdminPermission:
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.agency_admin_group = AgencyAdminGroupFactory()
        self.agent_group = AgentGroupFactory()

    def test_anonymous_user_is_not_admin(self):
        request = self.factory.get('/')
        request.user = AnonymousUser()
        permission = IsAgencyAdmin()
        assert not permission.has_permission(request, None)

    def test_authenticated_non_admin_user_is_not_admin(self):
        user = UserFactory(groups=[self.agent_group])
        request = self.factory.get('/')
        request.user = user
        permission = IsAgencyAdmin()
        assert not permission.has_permission(request, None)

    def test_user_in_agency_admin_group_is_admin(self):
        user = UserFactory(groups=[self.agency_admin_group])
        request = self.factory.get('/')
        request.user = user
        permission = IsAgencyAdmin()
        assert permission.has_permission(request, None)

    def test_superuser_is_admin(self):
        superuser = UserFactory(is_superuser=True, is_staff=True, agency=None)
        request = self.factory.get('/')
        request.user = superuser
        permission = IsAgencyAdmin()
        assert permission.has_permission(request, None)

    def test_user_with_required_permissions_is_admin(self):
        user = UserFactory()
        # Get the permissions required by the IsAgencyAdmin class
        user_ct = ContentType.objects.get(app_label='accounts', model='user')
        branch_ct = ContentType.objects.get(app_label='accounts', model='agencybranch')
        
        perms_to_add = [
            Permission.objects.get(content_type=user_ct, codename='add_user'),
            Permission.objects.get(content_type=user_ct, codename='change_user'),
            Permission.objects.get(content_type=user_ct, codename='delete_user'),
            Permission.objects.get(content_type=user_ct, codename='view_user'),
            Permission.objects.get(content_type=branch_ct, codename='add_agencybranch'),
            Permission.objects.get(content_type=branch_ct, codename='change_agencybranch'),
            Permission.objects.get(content_type=branch_ct, codename='delete_agencybranch'),
        ]
        user.user_permissions.set(perms_to_add)
        
        request = self.factory.get('/')
        request.user = user
        permission = IsAgencyAdmin()
        assert permission.has_permission(request, None)

class TestCanManageUsersPermission:
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.agency1 = AgencyFactory()
        self.agency2 = AgencyFactory()

        self.admin_group = AgencyAdminGroupFactory()
        self.manager_group = ManagerGroupFactory()
        self.agent_group = AgentGroupFactory()

        self.admin_agency1 = UserFactory(agency=self.agency1, groups=[self.admin_group])
        self.manager_agency1 = UserFactory(agency=self.agency1, groups=[self.manager_group])
        self.agent_agency1 = UserFactory(agency=self.agency1, groups=[self.agent_group])
        self.user_agency2 = UserFactory(agency=self.agency2, groups=[self.admin_group])
        self.superuser = UserFactory(is_superuser=True, is_staff=True, agency=None)

    def test_has_permission_create_with_add_user_perm(self):
        request = self.factory.post('/users/')
        request.user = self.admin_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'create'})
        assert permission.has_permission(request, mock_view)

    def test_has_permission_create_without_add_user_perm(self):
        request = self.factory.post('/users/')
        request.user = self.agent_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'create'})
        assert not permission.has_permission(request, mock_view)
    
    def test_has_permission_for_list_action(self):
        request = self.factory.get('/users/')
        request.user = self.agent_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'list'})
        assert permission.has_permission(request, mock_view)

    def test_has_object_permission_self_user_always_allowed(self):
        request = self.factory.get(f'/users/{self.agent_agency1.id}/')
        request.user = self.agent_agency1
        permission = CanManageUsers()
        mock_view_retrieve = type('MockView', (object,), {'action': 'retrieve'})
        mock_view_update = type('MockView', (object,), {'action': 'update'})
        assert permission.has_object_permission(request, mock_view_retrieve, self.agent_agency1)
        assert permission.has_object_permission(request, mock_view_update, self.agent_agency1)

    def test_has_object_permission_manager_can_change_agent(self):
        request = self.factory.patch(f'/users/{self.agent_agency1.id}/')
        request.user = self.manager_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'partial_update'})
        assert permission.has_object_permission(request, mock_view, self.agent_agency1)

    def test_has_object_permission_agent_cannot_view_other_user(self):
        request = self.factory.get(f'/users/{self.admin_agency1.id}/')
        request.user = self.agent_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'retrieve'})
        assert not permission.has_object_permission(request, mock_view, self.admin_agency1)

    def test_has_object_permission_cross_agency_is_denied(self):
        request = self.factory.get(f'/users/{self.user_agency2.id}/')
        request.user = self.admin_agency1
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'retrieve'})
        assert not permission.has_object_permission(request, mock_view, self.user_agency2)

    def test_has_object_permission_superuser_always_allowed_cross_agency(self):
        request = self.factory.get(f'/users/{self.user_agency2.id}/')
        request.user = self.superuser
        permission = CanManageUsers()
        mock_view = type('MockView', (object,), {'action': 'retrieve'})
        assert permission.has_object_permission(request, mock_view, self.user_agency2)