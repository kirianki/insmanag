# apps/auditing/models.py
from django.db import models
from apps.accounts.models import Agency, AgencyBranch, User

class SystemLog(models.Model):
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="logs")
    branch = models.ForeignKey(AgencyBranch, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=100, db_index=True)
    details = models.JSONField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        
        # --- FIX: Use a unique, descriptive codename for your custom permission ---
        permissions = [
            ("can_view_audit_trail", "Can view the full system audit trail for their scope"),
        ]

    def __str__(self):
        user_email = self.user.email if self.user else "System"
        return f"{self.action_type} by {user_email} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"