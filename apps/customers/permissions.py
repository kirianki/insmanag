# apps/customers/permissions.py
from rest_framework.permissions import BasePermission

class IsLeadInScope(BasePermission):
    """
    Object-level permission to only allow users to access leads
    that are within their defined scope. This is a specific version

    of the global IsObjectInScope, tailored for the Lead model which
    lacks a direct 'branch' foreign key.

    - Superuser: Can access any lead.
    - Agency Admin: Can access leads within their own agency.
    - Branch Manager: Can access leads where the assigned agent belongs to their branch.
    - Agent: Can only access leads directly assigned to them.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Superusers can always access any object
        if user.is_superuser:
            return True
        
        # Agency Admin scope: Check if the lead's agency matches the user's agency.
        if user.is_agency_admin:
            return obj.agency == user.agency

        # Branch Manager scope: Check if the lead's assigned agent belongs to the user's branch.
        # This is the key logic that fixes the conversion bug.
        if user.is_branch_manager:
            return obj.assigned_agent.branch == user.branch

        # Agent scope: Check if the lead is directly assigned to the user.
        if user.is_agent:
            return obj.assigned_agent == user

        # Deny by default if no scope matches
        return False