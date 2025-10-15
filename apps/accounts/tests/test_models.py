# apps/accounts/tests/test_models.py
import pytest
from django.contrib.auth.models import Group
from django.db.utils import IntegrityError

from apps.accounts.models import Agency, AgencyBranch, User
from apps.accounts.tests.factories import (
    AgencyFactory, AgencyBranchFactory, UserFactory,
    AgencyAdminGroupFactory, AgentGroupFactory
)

pytestmark = pytest.mark.django_db

class TestAgencyModel:
    def test_create_agency(self):
        agency = AgencyFactory()
        assert Agency.objects.count() == 1
        assert agency.agency_name is not None
        assert agency.agency_code is not None

    def test_agency_str_representation(self):
        agency = AgencyFactory(agency_name="Test Agency")
        assert str(agency) == "Test Agency"

    def test_unique_agency_code(self):
        AgencyFactory(agency_code="UNIQUE001")
        with pytest.raises(IntegrityError):
            AgencyFactory(agency_code="UNIQUE001")

class TestAgencyBranchModel:
    def test_create_agency_branch(self):
        agency = AgencyFactory()
        branch = AgencyBranchFactory(agency=agency)
        assert AgencyBranch.objects.count() == 1
        assert branch.agency == agency
        assert branch.branch_name is not None

    def test_agency_branch_str_representation(self):
        agency = AgencyFactory(agency_name="Main Agency")
        branch = AgencyBranchFactory(agency=agency, branch_name="Downtown Branch")
        assert str(branch) == "Main Agency - Downtown Branch"

class TestCustomUserManager:
    def test_create_user_with_email(self):
        user = User.objects.create_user(
            email='test@example.com',
            password='strongpassword',
            first_name='Test',
            last_name='User',
            agency=AgencyFactory()
        )
        assert user.email == 'test@example.com'
        assert user.check_password('strongpassword')
        assert not user.is_staff
        assert not user.is_superuser
        assert user.agency is not None

    def test_create_user_without_email_raises_error(self):
        with pytest.raises(ValueError, match="The Email field must be set"):
            User.objects.create_user(email='', password='password')

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            email='admin@example.com',
            password='strongpassword'
        )
        assert superuser.email == 'admin@example.com'
        assert superuser.check_password('strongpassword')
        assert superuser.is_staff
        assert superuser.is_superuser
        assert superuser.agency is None # Superusers should not be tied to a specific agency

class TestUserModel:
    def test_user_str_representation(self):
        user = UserFactory(email="user@agency.com")
        assert str(user) == "user@agency.com"

    def test_user_agency_relationship(self):
        agency = AgencyFactory()
        user = UserFactory(agency=agency)
        assert user.agency == agency

    def test_user_branch_relationship(self):
        branch = AgencyBranchFactory()
        user = UserFactory(branch=branch, agency=branch.agency)
        assert user.branch == branch
        assert user.agency == branch.agency

    def test_user_manager_relationship(self):
        manager = UserFactory()
        agent = UserFactory(manager=manager, agency=manager.agency)
        assert agent.manager == manager
        assert manager.team_members.filter(pk=agent.pk).exists()

    def test_user_groups_relationship(self):
        agency_admin_group = AgencyAdminGroupFactory()
        user = UserFactory()
        user.groups.add(agency_admin_group)
        assert user.groups.filter(name="Agency Admin").exists()
        assert agency_admin_group in user.groups.all()

    def test_user_default_ordering(self):
        UserFactory(email="b@example.com")
        UserFactory(email="a@example.com")
        users = User.objects.all()
        assert users[0].email == "a@example.com"
        assert users[1].email == "b@example.com"