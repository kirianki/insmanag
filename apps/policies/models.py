# apps/policies/models.py
from django.db import models
from django.core.validators import EmailValidator, RegexValidator
from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import Agency, AgencyBranch, User
from apps.customers.models import Customer
from .services import PolicyNumberService

class InsuranceProvider(UUIDModel, TimestampedModel):
    """
    Represents an insurance company/provider with full contact information
    """
    # Basic Information
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(max_length=100, blank=True, help_text="Abbreviated name or trading name")
    registration_number = models.CharField(max_length=100, blank=True, help_text="Company registration number")
    is_active = models.BooleanField(default=True)
    
    # Contact Information
    email = models.EmailField(validators=[EmailValidator()], blank=True)
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone_number = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    alternative_phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    fax_number = models.CharField(max_length=17, blank=True)
    website = models.URLField(blank=True)
    
    # Address and Contact Details...
    physical_address = models.TextField(blank=True, help_text="Street address")
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default="Kenya")
    postal_address = models.CharField(max_length=255, blank=True, help_text="P.O. Box address")
    contact_person_name = models.CharField(max_length=255, blank=True)
    contact_person_email = models.EmailField(validators=[EmailValidator()], blank=True)
    contact_person_phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    claims_email = models.EmailField(validators=[EmailValidator()], blank=True, help_text="Dedicated claims email")
    claims_phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    
    # Business Information
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Default commission percentage")
    notes = models.TextField(blank=True, help_text="Internal notes about this provider")
    logo = models.ImageField(upload_to='provider_logos/', blank=True, null=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Insurance Provider"
        verbose_name_plural = "Insurance Providers"
    
    def __str__(self):
        return self.name

class PolicyType(UUIDModel, TimestampedModel):
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="policy_types")
    name = models.CharField(max_length=100)
    requires_vehicle_reg = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        unique_together = [['agency', 'name']]
    
    def __str__(self):
        return self.name

class Policy(UUIDModel, TimestampedModel):
    class Status(models.TextChoices):
        AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting Payment"
        PAID_PENDING_ACTIVATION = "PAID_PENDING_ACTIVATION", "Paid - Pending Activation"
        ACTIVE = "ACTIVE", "Active"
        # --- NEW STATUS FOR INSTALLMENT-BASED POLICIES ---
        ACTIVE_INSTALLMENT = "ACTIVE_INSTALLMENT", "Active (Installment)"
        LAPSED = "LAPSED", "Lapsed"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
    
    policy_number = models.CharField(max_length=100, unique=True, blank=True)
    
    # Denormalized fields for performance and simpler permission scoping.
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="policies")
    branch = models.ForeignKey(AgencyBranch, on_delete=models.PROTECT, related_name="policies", null=True, blank=True)
    
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="policies")
    agent = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sold_policies")
    provider = models.ForeignKey(InsuranceProvider, on_delete=models.PROTECT, related_name="policies")
    policy_type = models.ForeignKey(PolicyType, on_delete=models.PROTECT, related_name="policies")
    
    # --- RENAMED for clarity ---
    total_premium_amount = models.DecimalField(max_digits=12, decimal_places=2)
    policy_start_date = models.DateField()
    policy_end_date = models.DateField()
    vehicle_registration_number = models.CharField(max_length=20, blank=True, null=True)
    insurance_certificate_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AWAITING_PAYMENT, db_index=True)
    # --- NEW FIELD to identify installment policies ---
    is_installment = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Policy"
        verbose_name_plural = "Policies"

    def __str__(self):
        return self.policy_number
    
    def save(self, *args, **kwargs):
        # Generate a unique policy number if one is not provided.
        if not self.policy_number:
            self.policy_number = PolicyNumberService.generate_policy_number()
            while Policy.objects.filter(policy_number=self.policy_number).exists():
                self.policy_number = PolicyNumberService.generate_policy_number()
        
        # Automatically set the agency and branch from the policy's customer.
        # This is the single source of truth and guarantees data consistency.
        if self.customer:
            self.agency = self.customer.agency
            self.branch = self.customer.branch
            
        super().save(*args, **kwargs)

# --- NEW MODEL to manage individual installments ---
class PolicyInstallment(UUIDModel, TimestampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
    
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="installments")
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    paid_on = models.DateField(null=True, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['due_date']
        verbose_name = "Policy Installment"
        verbose_name_plural = "Policy Installments"

    def __str__(self):
        return f"Installment for {self.policy.policy_number} due {self.due_date}"