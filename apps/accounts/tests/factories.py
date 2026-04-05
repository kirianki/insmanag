# apps/accounts/tests/factories.py
import factory
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from ..models import Agency, AgencyBranch, User
from apps.customers.models import Customer
from apps.policies.models import Policy, PolicyType  # Import policies models
from apps.claims.models import Claim, ClaimDocument  # Import claims models
from apps.commissions.models import StaffCommission  # Import commissions models
# from apps.analytics.models import AnalyticsDashboard  # Import analytics model


# Factory for basic permissions
class PermissionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Permission
        django_get_or_create = ('codename', 'content_type')

    name = factory.Sequence(lambda n: f"Can do something {n}")
    codename = factory.Sequence(lambda n: f"do_something_{n}")
    content_type = factory.LazyFunction(lambda: ContentType.objects.get_for_model(User))


# Factories for your models
class AgencyFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Agency

    agency_name = factory.Sequence(lambda n: f"Agency {n}")
    agency_code = factory.Sequence(lambda n: f"AGN{n:03d}")


class AgencyBranchFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = AgencyBranch

    agency = factory.SubFactory(AgencyFactory)
    branch_name = factory.Sequence(lambda n: f"Branch {n}")


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ('email',)
        skip_postgeneration_save = True

    class Params:
        without_branch = factory.Trait(branch=None)

    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Sequence(lambda n: f"user_{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        password = extracted or 'password123'
        self.set_password(password)
        if create:
            self.save()

    agency = factory.SubFactory(AgencyFactory)
    branch = factory.Maybe(
        'agency',
        yes_declaration=factory.SubFactory(AgencyBranchFactory, agency=factory.SelfAttribute('..agency')),
        no_declaration=None,
    )

    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.groups.add(*extracted)

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.user_permissions.add(*extracted)


class GroupFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Group
        django_get_or_create = ('name',)
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"Group {n}")

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        self.permissions.add(*extracted)


def get_or_create_permission(app_label, model_name, codename):
    model_map = {
        ('accounts', 'user'): User,
        ('auth', 'group'): Group,
        ('accounts', 'agency'): Agency,
        ('accounts', 'agencybranch'): AgencyBranch,
        ('customers', 'customer'): Customer,
        ('policies', 'policy'): Policy,
        ('policies', 'policytype'): PolicyType,
        ('claims', 'claim'): Claim,
        ('claims', 'claimdocument'): ClaimDocument,
        ('commissions', 'staffcommission'): StaffCommission,
# ('analytics', 'analyticsdashboard'): AnalyticsDashboard,
    }
    model_class = model_map.get((app_label, model_name))
    if not model_class:
        raise ValueError(f"Model class for {app_label}.{model_name} not found.")
    content_type = ContentType.objects.get_for_model(model_class)
    permission, _ = Permission.objects.get_or_create(
        codename=codename, content_type=content_type
    )
    return permission


# Specific User Role Factories
class AgencyAdminGroupFactory(GroupFactory):
    name = "Agency Admin"

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create:
            return
        perms_to_add = [
            # Full permissions for all apps
            get_or_create_permission('accounts', 'user', 'view_user'),
            get_or_create_permission('accounts', 'user', 'add_user'),
            get_or_create_permission('accounts', 'user', 'change_user'),
            get_or_create_permission('accounts', 'user', 'delete_user'),
            get_or_create_permission('customers', 'customer', 'view_customer'),
            get_or_create_permission('customers', 'customer', 'add_customer'),
            get_or_create_permission('customers', 'customer', 'change_customer'),
            get_or_create_permission('customers', 'customer', 'delete_customer'),
            get_or_create_permission('policies', 'policy', 'view_policy'),
            get_or_create_permission('policies', 'policy', 'add_policy'),
            get_or_create_permission('policies', 'policy', 'change_policy'),
            get_or_create_permission('policies', 'policy', 'delete_policy'),
            get_or_create_permission('claims', 'claim', 'view_claim'),
            get_or_create_permission('claims', 'claim', 'add_claim'),
            get_or_create_permission('claims', 'claim', 'change_claim'),
            get_or_create_permission('claims', 'claim', 'delete_claim'),
            get_or_create_permission('claims', 'claimdocument', 'add_claimdocument'),
            get_or_create_permission('commissions', 'staffcommission', 'can_approve_commission'),
            # get_or_create_permission('analytics', 'analyticsdashboard', 'view_dashboard_summary'),
        ]
        self.permissions.add(*perms_to_add)
        if create:
            self.save()


class ManagerGroupFactory(GroupFactory):
    name = "Manager"

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create:
            return
        perms_to_add = [
            # Accounts
            get_or_create_permission('accounts', 'user', 'view_user'),
            get_or_create_permission('accounts', 'user', 'add_user'),
            get_or_create_permission('accounts', 'user', 'change_user'),
            # Customers
            get_or_create_permission('customers', 'customer', 'view_customer'),
            get_or_create_permission('customers', 'customer', 'add_customer'),
            get_or_create_permission('customers', 'customer', 'change_customer'),
            # Policies
            get_or_create_permission('policies', 'policy', 'view_policy'),
            get_or_create_permission('policies', 'policy', 'add_policy'),
            get_or_create_permission('policies', 'policy', 'change_policy'),
            # Claims
            get_or_create_permission('claims', 'claim', 'view_claim'),
            get_or_create_permission('claims', 'claim', 'add_claim'),
            get_or_create_permission('claims', 'claim', 'change_claim'),
            get_or_create_permission('claims', 'claimdocument', 'add_claimdocument'),
            # Extra permissions
            get_or_create_permission('commissions', 'staffcommission', 'can_approve_commission'),
            # get_or_create_permission('analytics', 'analyticsdashboard', 'view_dashboard_summary'),
        ]
        self.permissions.add(*perms_to_add)
        if create:
            self.save()


class AgentGroupFactory(GroupFactory):
    name = "Agent"

    @factory.post_generation
    def permissions(self, create, extracted, **kwargs):
        if not create:
            return
        perms_to_add = [
            # Agents can add/change their own data
            get_or_create_permission('customers', 'customer', 'add_customer'),
            get_or_create_permission('policies', 'policy', 'add_policy'),
            get_or_create_permission('policies', 'policy', 'change_policy'),
            get_or_create_permission('claims', 'claim', 'add_claim'),
            get_or_create_permission('claims', 'claim', 'change_claim'),
            get_or_create_permission('claims', 'claimdocument', 'add_claimdocument'),
        ]
        self.permissions.add(*perms_to_add)
        if create:
            self.save()


class KYCOfficerGroupFactory(GroupFactory):
    name = "KYC Officer"
