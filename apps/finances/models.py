from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import UUIDModel, TimestampedModel
from apps.accounts.models import Agency, AgencyBranch, User

class ExpenseCategory(UUIDModel, TimestampedModel):
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="expense_categories")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ['agency', 'name']
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return self.name

class Expense(UUIDModel, TimestampedModel):
    class Frequency(models.TextChoices):
        ONE_TIME = "ONE_TIME", "One Time"
        WEEKLY = "WEEKLY", "Weekly"
        MONTHLY = "MONTHLY", "Monthly"
        QUARTERLY = "QUARTERLY", "Quarterly"
        ANNUALLY = "ANNUALLY", "Annually"

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="expenses")
    branch = models.ForeignKey(AgencyBranch, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name="expenses")
    
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    date_incurred = models.DateField()
    description = models.TextField(blank=True)
    
    # Recurring Logic
    frequency = models.CharField(max_length=20, choices=Frequency.choices, default=Frequency.ONE_TIME)
    is_recurring = models.BooleanField(default=False)
    next_due_date = models.DateField(null=True, blank=True, help_text="For recurring expenses")
    
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="recorded_expenses")

    def __str__(self):
        return f"{self.category.name} - {self.amount} ({self.date_incurred})"

    def calculate_next_date(self, start_date=None):
        """Calculates the next occurrence date based on frequency."""
        from datetime import timedelta
        import calendar
        
        base_date = start_date or self.date_incurred
        if self.frequency == self.Frequency.ONE_TIME:
            return None
        
        if self.frequency == self.Frequency.WEEKLY:
            return base_date + timedelta(days=7)
            
        if self.frequency == self.Frequency.MONTHLY:
            # Handle month wrap-around
            month = base_date.month % 12 + 1
            year = base_date.year + (base_date.month // 12)
            day = min(base_date.day, calendar.monthrange(year, month)[1])
            return base_date.replace(year=year, month=month, day=day)

        if self.frequency == self.Frequency.QUARTERLY:
            month = base_date.month + 3
            year = base_date.year + (month - 1) // 12
            month = (month - 1) % 12 + 1
            day = min(base_date.day, calendar.monthrange(year, month)[1])
            return base_date.replace(year=year, month=month, day=day)

        if self.frequency == self.Frequency.ANNUALLY:
            try:
                return base_date.replace(year=base_date.year + 1)
            except ValueError:
                # Handle Feb 29th on non-leap years
                return base_date.replace(year=base_date.year + 1, day=28)
        
        return None

# --- Deductions Configuration ---

class DeductionType(UUIDModel, TimestampedModel):
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="deduction_types")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ['agency', 'name']

    def __str__(self):
        return self.name

class ContractDeduction(UUIDModel, TimestampedModel):
    class AmountType(models.TextChoices):
        FIXED = "FIXED", "Fixed Amount"
        PERCENTAGE_OF_BASE = "PERCENTAGE_OF_BASE", "Percentage of Base Salary"

    contract = models.ForeignKey("StaffContract", on_delete=models.CASCADE, related_name="deductions")
    deduction_type = models.ForeignKey(DeductionType, on_delete=models.PROTECT)
    amount_type = models.CharField(max_length=20, choices=AmountType.choices, default=AmountType.FIXED)
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount value or Percentage (e.g. 5.0 for 5%)")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        val = f"{self.amount}%" if self.amount_type == self.AmountType.PERCENTAGE_OF_BASE else f"{self.amount}"
        return f"{self.deduction_type.name} ({val}) for {self.contract.user}"

# --- Payroll Models ---

class StaffContract(UUIDModel, TimestampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="contract")
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE)
    
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Monthly retainer/base salary")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    tax_pin = models.CharField(max_length=50, blank=True, null=True)
    nssf_number = models.CharField(max_length=50, blank=True, null=True, help_text="Social Security Number")
    nhif_number = models.CharField(max_length=50, blank=True, null=True, help_text="Health Insurance Number")

    def __str__(self):
        return f"Contract for {self.user}"

class PayrollRun(UUIDModel, TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="payroll_runs")
    month = models.DateField(help_text="The first day of the month being paid")
    run_date = models.DateField(auto_now_add=True)
    
    processed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="processed_payrolls")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    total_payout = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ['agency', 'month']

    def __str__(self):
        return f"Payroll {self.month.strftime('%B %Y')} - {self.agency.agency_name}"

class StaffPayment(UUIDModel, TimestampedModel):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="payments")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="salary_payments")
    
    base_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    commission_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    bonus = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Storing deductions aggregate
    deductions_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    net_pay = models.DecimalField(max_digits=12, decimal_places=2)
    
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Payment for {self.user} - {self.payroll_run}"

class StaffDeduction(UUIDModel, TimestampedModel):
    payment = models.ForeignKey(StaffPayment, on_delete=models.CASCADE, related_name="deductions")
    deduction_type = models.ForeignKey(DeductionType, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=100, help_text="e.g. Tax, Advance, Loan")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    def __str__(self):
        return f"{self.name}: {self.amount}"

# --- Agency Revenue (for P&L) ---

class AgencyRevenue(UUIDModel, TimestampedModel):
    """
    Tracks the actual income recognized by the Agency from policies.
    This is usually: (Premium * Commission Rate) - (Provider Deductions if any).
    It is separated from 'Commissions' (which usually implies outgoing staff pay) to clarity.
    """
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="revenues")
    
    # Link to source
    policy = models.ForeignKey("policies.Policy", on_delete=models.PROTECT, related_name="agency_revenues")
    installment = models.ForeignKey("policies.PolicyInstallment", on_delete=models.SET_NULL, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Net revenue for the agency")
    date_recognized = models.DateField()
    
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Revenue {self.amount} from {self.policy.policy_number}"
