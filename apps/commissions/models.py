# apps/commissions/models.py

from django.db import models
from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import Agency, AgencyBranch, User
from apps.customers.models import Customer

# FIXED: The direct import from apps.policies.models has been completely removed
# to break the circular dependency. We will use string relations instead.


class CustomerPayment(UUIDModel, TimestampedModel):
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="payments")
    
    # FIXED: Changed Policy to a string reference 'policies.Policy'
    policy = models.ForeignKey("policies.Policy", on_delete=models.PROTECT, related_name="payments")
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    mpesa_reference = models.CharField(max_length=100, unique=True)
    payment_date = models.DateTimeField()
    
    def __str__(self):
        # Accessing policy number here is fine as it happens at runtime, not import time
        return f"Payment of {self.amount} for {self.policy.policy_number}"


class ProviderCommissionStructure(UUIDModel, TimestampedModel):
    class CommissionType(models.TextChoices):
        NEW_BUSINESS = "NEW_BUSINESS", "New Business"
        RENEWAL = "RENEWAL", "Renewal"
    
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="provider_commission_structures", null=True, blank=True)
    
    # FIXED: Changed InsuranceProvider and PolicyType to string references
    provider = models.ForeignKey("policies.InsuranceProvider", on_delete=models.CASCADE, related_name="commission_structures")
    policy_type = models.ForeignKey("policies.PolicyType", on_delete=models.PROTECT)
    
    commission_type = models.CharField(max_length=20, choices=CommissionType.choices)
    rate_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    
    class Meta:
        unique_together = ['agency', 'provider', 'policy_type', 'commission_type']


class StaffCommissionRule(UUIDModel, TimestampedModel):
    class PayoutBasis(models.TextChoices):
        AGENCY_COMMISSION = "AGENCY_COMMISSION", "Agency Commission"
        TOTAL_PREMIUM = "TOTAL_PREMIUM", "Total Premium"
    
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="staff_commission_rules", null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="commission_rules", null=True, blank=True)
    
    # FIXED: Changed PolicyType to a string reference
    policy_type = models.ForeignKey(
        "policies.PolicyType", 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True, 
        help_text="Optional: Make this rule specific to a policy type"
    )
    
    payout_basis = models.CharField(max_length=20, choices=PayoutBasis.choices)
    rate_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    monthly_threshold = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.00,
        help_text="The monthly production amount (based on payout_basis) that must be reached before commission is earned."
    )
    
    class Meta:
        unique_together = [['agency', 'user', 'policy_type']]


class PayoutBatch(UUIDModel, TimestampedModel):
    class Status(models.TextChoices):
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
    
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT)
    initiated_by = models.ForeignKey(User, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROCESSING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    commission_count = models.PositiveIntegerField(default=0)


class StaffCommission(UUIDModel, TimestampedModel):
    class CommissionType(models.TextChoices):
        PAYOUT = "PAYOUT", "Direct Payout"
        UPLINE = "UPLINE", "Upline Payout"
        BONUS = "BONUS", "Bonus"
        CLAWBACK = "CLAWBACK", "Clawback"
    
    class Status(models.TextChoices):
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        BATCHED = "BATCHED", "Batched for Payout"
        PAID = "PAID", "Paid"
        REVERSED = "REVERSED", "Reversed"

    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="commissions", null=True, blank=True)
    branch = models.ForeignKey(AgencyBranch, on_delete=models.PROTECT, related_name="commissions", null=True, blank=True)
    agent = models.ForeignKey(User, on_delete=models.PROTECT, related_name="commissions")
    
    # FIXED: Changed Policy and PolicyInstallment to string references
    policy = models.ForeignKey("policies.Policy", on_delete=models.PROTECT, related_name="commissions")
    installment = models.ForeignKey(
        "policies.PolicyInstallment",
        on_delete=models.PROTECT,
        related_name="commissions",
        null=True, blank=True,
        help_text="The specific installment this commission was generated from."
    )
    
    commission_type = models.CharField(max_length=20, choices=CommissionType.choices)
    commission_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_APPROVAL, db_index=True)
    payout_batch = models.ForeignKey(PayoutBatch, on_delete=models.SET_NULL, related_name="commissions", null=True, blank=True)
    applied_rule_details = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        permissions = [("can_approve_commission", "Can approve staff commission")]