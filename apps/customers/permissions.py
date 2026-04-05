# apps/customers/permissions.py
from rest_framework.permissions import BasePermission

class IsLeadInScope(BasePermission):
    """
    Object-level permission to only allow users to access leads
    that are within their defined scope. 
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.is_superuser:
            return True
        
        # Check IDs directly to avoid object comparison issues
        if user.is_agency_admin:
            return obj.agency_id == user.agency_id

        if user.is_branch_manager:
            # Ensure branch exists on both sides
            if user.branch_id and obj.assigned_agent.branch_id == user.branch_id:
                return True

        if user.is_agent:
            return obj.assigned_agent_id == user.id

        return False

class IsRenewalInScope(BasePermission):
    """
    Object-level permission for Renewals.
    
    Since the Renewal model does not have direct 'agency' or 'branch' fields,
    scope validation must traverse through the related 'customer' object.
    
    This implementation uses ID comparison and fall-through logic to handle
    users who might have multiple roles (e.g. Manager AND Agent).
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # 1. Superuser: Full Access
        if user.is_superuser:
            return True
        
        # 2. Agency Admin: Access if customer belongs to their agency
        if user.is_agency_admin:
            if obj.customer.agency_id == user.agency_id:
                return True
            # Do not return False here; allow fall-through in case of weird role combos

        # 3. Branch Manager: Access if customer belongs to their branch
        if user.is_branch_manager:
            # Use IDs for safe comparison. 
            # Ensure user has a branch and it matches the customer's branch.
            if user.branch_id and obj.customer.branch_id == user.branch_id:
                return True

        # 4. Agent: Access if they created it OR are assigned to the customer
        if user.is_agent:
            if obj.created_by_id == user.id or obj.customer.assigned_agent_id == user.id:
                return True

        # If none of the above conditions were met, deny access.
        return False