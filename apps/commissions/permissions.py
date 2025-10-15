# apps/commissions/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.accounts.permissions import IsAgencyAdmin

class CanManageCommissionRules(IsAgencyAdmin):
    """
    Permission to manage commission structures and staff rules.
    Inherits from IsAgencyAdmin, as only admins should manage these settings.
    """
    pass # All logic is handled by the parent IsAgencyAdmin class

class CanManageStaffCommissions(BasePermission):
    """
    - Agents can only view their own commission records.
    - Users with 'can_approve_commission' permission (Managers/Admins) can view all
      commissions in their agency and perform approval actions.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.is_superuser:
            return True
            
        if obj.agent.agency != user.agency:
            return False
            
        # The agent who owns the commission can only view it.
        if obj.agent == user:
            return request.method in SAFE_METHODS
            
        # A user with the specific approval permission can perform any action.
        if user.has_perm('commissions.can_approve_commission'):
            return True
            
        return False

class CanManagePayouts(IsAgencyAdmin):
    """
    Permission to create and view payout batches.
    Only Agency Admins should be able to initiate payouts.
    """
    pass # All logic is handled by the parent IsAgencyAdmin class