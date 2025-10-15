# apps/accounts/permissions.py
from rest_framework import permissions

# --- ADDED: Import the models we need to check against ---
from apps.policies.models import Policy, PolicyInstallment
from apps.customers.models import Customer
from apps.accounts.models import Agency, User  # FIXED: Added User import

class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_superuser

class IsAgencyAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_agency_admin

class IsBranchManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_branch_manager

class IsAgent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_agent

class IsObjectInScope(permissions.BasePermission):
    """
    A comprehensive permission that checks if an object is within the user's scope.
    - Superusers can access anything.
    - Agency Admins can access objects belonging to their agency.
    - Branch Managers can access objects belonging to their branch.
    - Agents can access objects assigned to them or within their branch.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_superuser:
            return True

        # --- NEW: Smartly handle the Agency model itself ---
        # This is the key change. We can now check permissions directly on an Agency.
        if isinstance(obj, Agency):
            if user.is_agency_admin:
                return obj == user.agency
            # Deny permission for other roles on the agency object itself
            return False

        # NEW: Handle unassigned users (branch=None) smoothly - allow if in agency scope
        if isinstance(obj, User) and not obj.branch:
            if user.is_agency_admin:
                return obj.agency == user.agency
            return False

        # --- Smartly handle PolicyInstallment by checking its parent policy ---
        if isinstance(obj, PolicyInstallment):
            # Redirect the permission check to the installment's parent policy
            obj = obj.policy
        
        # Determine the object's scope
        obj_agency = getattr(obj, 'agency', None)
        obj_branch = getattr(obj, 'branch', None)
        obj_agent = getattr(obj, 'agent', None)
        obj_assigned_agent = getattr(obj, 'assigned_agent', None) # For Customer model

        if user.is_agency_admin:
            return obj_agency == user.agency

        if user.is_branch_manager:
            # NEW: Branch managers can access unassigned users in their agency if no branch match
            if not obj_branch and obj_agency == user.agency:
                return True
            return obj_branch == user.branch

        if user.is_agent:
            # An agent can see objects in their branch, but typically only act on
            # objects directly assigned to them.
            agent_field = obj_agent or obj_assigned_agent
            return agent_field == user
        
        return False