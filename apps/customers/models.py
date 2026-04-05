# apps/customers/models.py
import uuid
from django.db import models
from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import Agency, AgencyBranch, User

class Customer(UUIDModel, TimestampedModel):
    class KYCStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="customers")
    # --- NEW: Added Branch for manager-level scoping ---
    branch = models.ForeignKey(AgencyBranch, on_delete=models.PROTECT, related_name="customers", null=True, blank=True)
    customer_number = models.CharField(max_length=50, unique=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50)
    id_number = models.CharField(max_length=50, blank=True, null=True)
    
    assigned_agent = models.ForeignKey(User, on_delete=models.PROTECT, related_name="customers")
    kyc_status = models.CharField(max_length=20, choices=KYCStatus.choices, default=KYCStatus.PENDING)
    kyc_verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name="verified_customers", null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        # The unique_together constraint might need adjustment if id_number can be null
        # unique_together = [['agency', 'id_number']] 
        
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if not self.customer_number:
            short_uuid = str(uuid.uuid4()).split('-')[0].upper()
            if self.agency and self.agency.agency_code:
                self.customer_number = f"{self.agency.agency_code}-{short_uuid}"
            else:
                self.customer_number = f"CUST-{short_uuid}"
        super().save(*args, **kwargs)


class CustomerDocument(UUIDModel, TimestampedModel):
    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        EXPIRED = "EXPIRED", "Expired"
        
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=100)
    document_number = models.CharField(max_length=100, blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    file = models.FileField(upload_to='kyc_documents/%Y/%m/')
    
    verification_status = models.CharField(max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True, help_text="Internal notes or rejection reason")
    is_active = models.BooleanField(default=True, help_text="Designates whether this document is currently active")
    
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.document_type} for {self.customer}"


class Lead(UUIDModel, TimestampedModel):
    class LeadStatus(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        QUALIFIED = "QUALIFIED", "Qualified"
        PROPOSAL_SENT = "PROPOSAL_SENT", "Proposal Sent"
        CONVERTED = "CONVERTED", "Converted"
        LOST = "LOST", "Lost"

    class LeadSource(models.TextChoices):
        WEBSITE = "WEBSITE", "Website"
        REFERRAL = "REFERRAL", "Referral"
        WALK_IN = "WALK_IN", "Walk-in"
        COLD_CALL = "COLD_CALL", "Cold Call"
        OTHER = "OTHER", "Other"

    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="leads")
    assigned_agent = models.ForeignKey(User, on_delete=models.PROTECT, related_name="leads")
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50)
    
    status = models.CharField(max_length=20, choices=LeadStatus.choices, default=LeadStatus.NEW, db_index=True)
    source = models.CharField(max_length=20, choices=LeadSource.choices, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    converted_customer = models.OneToOneField(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name="lead_origin")
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Lead: {self.first_name} {self.last_name}"


class Renewal(UUIDModel, TimestampedModel):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="renewals")
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_renewals")
    
    current_insurer = models.CharField(max_length=255, help_text="Name of the current insurance provider")
    policy_type_description = models.CharField(max_length=255, help_text="e.g., Motor Private, Home Insurance")
    renewal_date = models.DateField(db_index=True)
    
    premium_estimate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['renewal_date']

    def __str__(self):
        return f"Renewal for {self.customer} on {self.renewal_date}"