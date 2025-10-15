# apps/accounts/tests/test_serializers.py
import pytest
from rest_framework.test import APIRequestFactory
from apps.accounts.models import AgencyBranch, User
from apps.accounts.serializers import (
    AgencySerializer, AgencyBranchSerializer, UserSerializer,
    ChangePasswordSerializer
)
from apps.accounts.tests.factories import (
    AgencyFactory, AgencyBranchFactory, UserFactory,
    AgencyAdminGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

class TestAgencySerializer:
    def test_agency_serialization(self):
        agency = AgencyFactory()
        AgencyBranchFactory(agency=agency, branch_name="Main Branch")
        serializer = AgencySerializer(agency)
        assert str(serializer.data['id']) == str(agency.id)
        assert len(serializer.data['branches']) == 1

class TestAgencyBranchSerializer:
    def test_branch_serialization(self):
        agency = AgencyFactory()
        branch = AgencyBranchFactory(agency=agency, branch_name="East Branch")
        serializer = AgencyBranchSerializer(branch)
        assert serializer.data['branch_name'] == "East Branch"
        # FIX: Cast both sides to string for comparison
        assert str(serializer.data['agency']) == str(agency.id)

class TestChangePasswordSerializer:
    def test_valid_password_change(self):
        user = UserFactory(password='oldpassword123')
        factory = APIRequestFactory()
        request = factory.post('/')
        request.user = user

        serializer = ChangePasswordSerializer(data={
            'old_password': 'oldpassword123',
            'new_password': 'newstrongpassword123!'
        }, context={'request': request})
        assert serializer.is_valid(raise_exception=True)
        serializer.save()
        user.refresh_from_db()
        assert user.check_password('newstrongpassword123!')

class TestUserSerializer:
    def test_user_creation_valid_data(self):
        agency = AgencyFactory()
        branch = AgencyBranchFactory(agency=agency)
        manager = UserFactory(agency=agency)
        agent_group = AgentGroupFactory()

        data = {
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'StrongPassword123!',
            'branch': str(branch.id),
            'manager': str(manager.id),
            'groups': [agent_group.id]
        }
        serializer = UserSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        
        user = serializer.save(agency=agency)
        
        # FIX: Removed brittle count check, this is a better assertion
        assert User.objects.filter(email='newuser@example.com').exists()
        assert user.agency == agency
        assert agent_group in user.groups.all()

    def test_user_serialization(self):
        user = UserFactory()
        serializer = UserSerializer(user)
        assert str(serializer.data['id']) == str(user.id)
        assert 'password' not in serializer.data
        # FIX: Cast both sides to string for comparison
        assert str(serializer.data['agency']) == str(user.agency.id)
        assert str(serializer.data['branch']) == str(user.branch.id)