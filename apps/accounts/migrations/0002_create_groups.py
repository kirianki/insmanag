# apps/accounts/migrations/0002_create_groups.py
from django.db import migrations

# The names of the user roles/groups required by the application
GROUPS = ['Agency Admin', 'Branch Manager', 'Agent']

def create_groups(apps, schema_editor):
    """
    This function is executed when the migration is applied.
    It creates the default user groups if they don't already exist.
    """
    Group = apps.get_model('auth', 'Group')
    print() # Adds a newline for cleaner output
    for group_name in GROUPS:
        # get_or_create ensures this operation is idempotent (can be run multiple times safely)
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            print(f"Created/ensured group: {group_name}")

def remove_groups(apps, schema_editor):
    """
    This function is executed when the migration is reversed.
    It removes the groups that were created.
    """
    Group = apps.get_model('auth', 'Group')
    Group.objects.filter(name__in=GROUPS).delete()
    print(f"\nDeleted groups: {', '.join(GROUPS)}")


class Migration(migrations.Migration):

    dependencies = [
        # This migration must run AFTER the initial models for the 'accounts' app
        # and the built-in 'auth' app have been created.
        ('accounts', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'), 
    ]

    operations = [
        migrations.RunPython(create_groups, remove_groups),
    ]