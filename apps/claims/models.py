# apps/claims/models.py
from django.db import models
from apps.core.models import UUIDModel, TimestampedModel
from apps.policies.models import Policy
from apps.customers.models import Customer
from apps.accounts.models import User, Agency, AgencyBranch
from .services import ClaimNumberService

class Claim(UUIDModel, TimestampedModel):
    class Status(models.TextChoices):
        FNOL = "FNOL", "First Notice of Loss"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        AWAITING_DOCS = "AWAITING_DOCS", "Awaiting Documents"
        APPROVED = "APPROVED", "Approved"
        SETTLED = "SETTLED", "Settled / Paid"
        REJECTED = "REJECTED", "Rejected"
        CLOSED = "CLOSED", "Closed"

    claim_number = models.CharField(max_length=100, unique=True, blank=True)
    
    # Denormalized fields for performance and simpler permission scoping.
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="claims")
    branch = models.ForeignKey(AgencyBranch, on_delete=models.PROTECT, related_name="claims", null=True, blank=True)
    
    policy = models.ForeignKey(Policy, on_delete=models.PROTECT, related_name="claims")
    claimant = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="claims")
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="reported_claims")
    
    date_of_loss = models.DateField()
    loss_description = models.TextField()
    
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.FNOL, db_index=True)
    
    estimated_loss_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    settled_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        permissions = [
            ("can_settle_claim", "Can settle approved claims"),
        ]

    def __str__(self):
        return self.claim_number or f"Claim for {self.claimant}"

    def save(self, *args, **kwargs):
        if not self.claim_number:
            self.claim_number = ClaimNumberService.generate_claim_number()
        
        # Automatically set the agency and branch from the claim's policy.
        # This is the single source of truth and guarantees data consistency.
        if self.policy:
            self.agency = self.policy.agency
            self.branch = self.policy.branch
            
        super().save(*args, **kwargs)

class ClaimDocument(UUIDModel, TimestampedModel):
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=100, help_text="e.g., Police Report, Photo of Damage")
    file = models.FileField(upload_to='claim_documents/%Y/%m/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.document_type} for Claim {self.claim.claim_number}"