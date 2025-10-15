# apps/policies/permissions.py

# This file is intentionally left empty.
# We now rely on the reusable permission classes defined in `apps/accounts/permissions.py`
# to ensure a consistent and DRY (Don't Repeat Yourself) security model
# across the entire application.
#
# Key permissions used by this app's views include:
# - IsSuperUser, IsAgencyAdmin, IsBranchManager, IsAgent
# - IsObjectInScope