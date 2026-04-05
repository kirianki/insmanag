# apps/policies/models.py

from django.db import models
from django.db.models import JSONField, Sum
from django.core.validators import EmailValidator, RegexValidator

from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import Agency, AgencyBranch, User
from apps.customers.models import Customer
# NOTE: The direct import for CustomerPayment is intentionally removed from the top
# to prevent circular imports. It is imported locally where needed.
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
    """
    Defines the type of policy and its fundamental behavior, especially its payment structure.
    """
    class PaymentStructure(models.TextChoices):
        PREMIUM_BASED = "PREMIUM_BASED", "Premium Based"  # e.g., Motor, Property (one-off premium)
        RECURRING_FEE = "RECURRING_FEE", "Recurring Fee"  # e.g., Life, Health (monthly/quarterly fee)

    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="policy_types")
    name = models.CharField(max_length=100)
    requires_vehicle_reg = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    payment_structure = models.CharField(
        max_length=20,
        choices=PaymentStructure.choices,
        default=PaymentStructure.PREMIUM_BASED,
        help_text="Defines if this is a standard premium policy or a recurring payment policy."
    )

    class Meta:
        ordering = ['name']
        unique_together = [['agency', 'name']]

    def __str__(self):
        return self.name


class Policy(UUIDModel, TimestampedModel):
    """
    Represents a single insurance policy, linking all related entities and tracking its financial state and lifecycle.
    """
    class Status(models.TextChoices):
        AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting Payment"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID_PENDING_ACTIVATION = "PAID_PENDING_ACTIVATION", "Paid - Pending Activation"
        ACTIVE = "ACTIVE", "Active"
        ACTIVE_INSTALLMENT = "ACTIVE_INSTALLMENT", "Active (Installment)"
        AT_RISK_MISSING_PAYMENT = "AT_RISK_MISSING_PAYMENT", "At Risk (Missing Payment)"
        ACTIVE_RECURRING = "ACTIVE_RECURRING", "Active (Recurring)"
        LAPSED = "LAPSED", "Lapsed"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentFrequency(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        SEMI_ANNUALLY = "SEMI_ANNUALLY", "Semi-Annually"
        ANNUALLY = "ANNUALLY", "Annually"

    policy_number = models.CharField(max_length=100, unique=True, blank=True)
    agency = models.ForeignKey(Agency, on_delete=models.PROTECT, related_name="policies")
    branch = models.ForeignKey(AgencyBranch, on_delete=models.PROTECT, related_name="policies", null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="policies")
    agent = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sold_policies")
    provider = models.ForeignKey(InsuranceProvider, on_delete=models.PROTECT, related_name="policies")
    policy_type = models.ForeignKey(PolicyType, on_delete=models.PROTECT, related_name="policies")
    premium_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00,
        help_text="The total premium for premium-based policies, or the recurring fee amount for recurring policies."
    )
    sum_insured = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text="The total amount of coverage or sum assured (e.g., for life, property)."
    )
    deductible = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="The deductible or excess amount to be paid by the customer on a claim."
    )
    policy_start_date = models.DateField()
    policy_end_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.AWAITING_PAYMENT, db_index=True)
    is_installment = models.BooleanField(default=False, help_text="True if a premium-based policy is paid in installments.")
    vehicle_registration_number = models.CharField(max_length=20, blank=True, null=True)
    insurance_certificate_number = models.CharField(max_length=100, blank=True, null=True)
    additional_details = JSONField(
        default=dict, blank=True,
        help_text="Flexible field for policy-specific data (e.g., beneficiaries, property address)."
    )
    payment_frequency = models.CharField(
        max_length=20, choices=PaymentFrequency.choices, null=True, blank=True,
        help_text="The payment frequency for recurring fee policies."
    )
    next_due_date = models.DateField(
        null=True, blank=True,
        help_text="The date the next payment is due for a recurring policy."
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Policy"
        verbose_name_plural = "Policies"

    def __str__(self):
        return self.policy_number

    @property
    def amount_paid(self):
        """
        Calculates the total amount paid for this policy.
        - For installment policies: sums all PAID installments
        - For non-installment policies: sums CustomerPayment records
        """
        from apps.commissions.models import CustomerPayment
        
        if self.is_installment:
            # Sum only PAID installments
            total = self.installments.filter(status=PolicyInstallment.Status.PAID).aggregate(
                total=Sum('amount')
            )['total']
            return total or 0
        else:
            # Sum from CustomerPayment records
            total = CustomerPayment.objects.filter(policy=self).aggregate(
                total=Sum('amount')
            )['total']
            return total or 0

    @property
    def balance_due(self):
        """
        Calculates the outstanding balance for this policy.
        - For installment policies: sums all PENDING and OVERDUE installments
        - For recurring policies: returns 0 (managed per cycle)
        - For non-installment premium policies: premium_amount - amount_paid
        """
        if self.policy_type.payment_structure == PolicyType.PaymentStructure.RECURRING_FEE:
            return 0  # Recurring policies don't have a final balance
        
        if self.is_installment:
            # Sum outstanding (PENDING + OVERDUE) installments
            total = self.installments.filter(
                status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE]
            ).aggregate(total=Sum('amount'))['total']
            return total or 0
        else:
            # Non-installment: calculate from premium and payments
            balance = self.premium_amount - self.amount_paid
            return max(balance, 0)

    def save(self, *args, **kwargs):
        if not self.policy_number:
            self.policy_number = PolicyNumberService.generate_policy_number()
            while Policy.objects.filter(policy_number=self.policy_number).exists():
                self.policy_number = PolicyNumberService.generate_policy_number()
        if self.customer:
            self.agency = self.customer.agency
            self.branch = self.customer.branch
        super().save(*args, **kwargs)


class PolicyInstallment(UUIDModel, TimestampedModel):
    """
    Manages individual installments for a PREMIUM_BASED policy.
    """
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