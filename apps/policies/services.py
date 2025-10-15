# apps/policies/services.py
import datetime
import uuid
from django.db import transaction
from django.utils import timezone
from rest_framework import exceptions
from apps.commissions.services import CommissionService, CommissionGenerationError

class PolicyNumberService:
    """A self-contained service for generating unique policy numbers."""
    @staticmethod
    def generate_policy_number():
        today = datetime.date.today()
        year = today.strftime('%Y')
        unique_part = uuid.uuid4().hex[:6].upper()
        return f"POL-{year}-{unique_part}"

class PolicyService:
    @staticmethod
    @transaction.atomic
    def activate_policy(policy, certificate_number: str):
        """
        Activates a fully paid, NON-INSTALLMENT policy, updates its status, and triggers commission generation.
        """
        from .models import Policy

        if policy.is_installment:
            raise ValueError("This activation method is for non-installment policies. Please use the correct activation flow.")

        if policy.status != Policy.Status.PAID_PENDING_ACTIVATION:
            raise ValueError(f"Policy cannot be activated. Status must be 'Paid - Pending Activation'.")
            
        if not certificate_number:
            raise ValueError("An insurance certificate number is required to activate a policy.")

        policy.status = Policy.Status.ACTIVE
        policy.insurance_certificate_number = certificate_number
        policy.save(update_fields=['status', 'insurance_certificate_number', 'updated_at'])
        
        # Commissions for full policies are generated on activation.
        CommissionService.generate_for_policy(policy)
        
        return policy
    
    # --- NEW: Service for activating an INSTALLMENT policy ---
    @staticmethod
    @transaction.atomic
    def activate_installment_policy(policy, certificate_number: str, start_date: datetime.date = None, end_date: datetime.date = None):
        """
        Activates an installment-based policy after the first payment has been made.
        Allows for updating the policy start and end dates.
        """
        from .models import Policy

        if not policy.is_installment:
            raise ValueError("This activation method is only for installment policies.")

        if policy.status != Policy.Status.PAID_PENDING_ACTIVATION:
            raise ValueError(f"Policy cannot be activated. Status must be 'Paid - Pending Activation'.")

        if not certificate_number:
            raise ValueError("An insurance certificate number is required.")

        policy.status = Policy.Status.ACTIVE_INSTALLMENT
        policy.insurance_certificate_number = certificate_number
        
        update_fields = ['status', 'insurance_certificate_number', 'updated_at']

        if start_date:
            policy.policy_start_date = start_date
            update_fields.append('policy_start_date')
        
        if end_date:
            policy.policy_end_date = end_date
            update_fields.append('policy_end_date')

        policy.save(update_fields=update_fields)
        # Note: Commissions are generated per-installment, so we do NOT generate them here.
        return policy

    @staticmethod
    @transaction.atomic
    def record_installment_payment(installment, paid_on: datetime.date, transaction_ref: str):
        """
        Records a payment for an installment, updates statuses, and triggers commissions.
        """
        from .models import Policy, PolicyInstallment

        if installment.status == PolicyInstallment.Status.PAID:
            raise ValueError("This installment has already been paid.")

        installment.status = PolicyInstallment.Status.PAID
        installment.paid_on = paid_on
        installment.transaction_reference = transaction_ref
        installment.save()

        policy = installment.policy
        # --- FIX: On first payment, move policy to 'Pending Activation', DO NOT activate it. ---
        is_first_payment = not policy.installments.filter(status=PolicyInstallment.Status.PAID).exclude(pk=installment.pk).exists()
        if is_first_payment and policy.status == Policy.Status.AWAITING_PAYMENT:
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
            policy.save(update_fields=['status', 'updated_at'])

        # If all installments are now paid, update policy to fully Active
        if not policy.installments.filter(status=PolicyInstallment.Status.PENDING).exists():
            policy.status = Policy.Status.ACTIVE
            policy.save(update_fields=['status', 'updated_at'])
        
        CommissionService.generate_for_installment(installment)

        return installment

# ... (PaymentSimulationService remains unchanged) ...
class PaymentSimulationService:
    @staticmethod
    @transaction.atomic
    def simulate_payment(item_type: str, item_id: str, user: "User") -> dict:
        from .models import Policy, PolicyInstallment
        from apps.commissions.models import CustomerPayment
        mpesa_ref = f"SIM_{uuid.uuid4().hex[:10].upper()}"
        if item_type == 'POLICY':
            try: policy = Policy.objects.get(pk=item_id, status=Policy.Status.AWAITING_PAYMENT)
            except Policy.DoesNotExist: raise exceptions.NotFound("This policy is not awaiting payment or does not exist.")
            if not user.is_superuser and policy.agency != user.agency: raise exceptions.PermissionDenied("You cannot simulate payments for this agency.")
            CustomerPayment.objects.create(customer=policy.customer, policy=policy, amount=policy.total_premium_amount, mpesa_reference=mpesa_ref, payment_date=timezone.now())
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
            policy.save(update_fields=['status', 'updated_at'])
            return {"message": f"Successfully simulated payment for policy {policy.policy_number}."}
        elif item_type == 'INSTALLMENT':
            try: installment = PolicyInstallment.objects.select_related('policy').get(pk=item_id, status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE])
            except PolicyInstallment.DoesNotExist: raise exceptions.NotFound("This installment is not pending payment or does not exist.")
            if not user.is_superuser and installment.policy.agency != user.agency: raise exceptions.PermissionDenied("You cannot simulate payments for this agency.")
            CustomerPayment.objects.create(customer=installment.policy.customer, policy=installment.policy, amount=installment.amount, mpesa_reference=mpesa_ref, payment_date=timezone.now())
            PolicyService.record_installment_payment(installment=installment, paid_on=timezone.now().date(), transaction_ref=mpesa_ref)
            return {"message": f"Successfully simulated payment for installment on policy {installment.policy.policy_number}."}
        else: raise exceptions.ValidationError("Invalid item_type specified.")