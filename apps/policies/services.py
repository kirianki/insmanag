import datetime
import uuid
from decimal import Decimal
from dateutil.relativedelta import relativedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import exceptions

from apps.commissions.services import CommissionService, CommissionGenerationError
from apps.commissions.models import CustomerPayment, StaffCommission


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
    def activate_policy(policy, insurance_certificate_number: str, start_date: datetime.date = None, end_date: datetime.date = None):
        """
        Activates a policy that is in a 'Paid - Pending Activation' state.
        This single method handles all policy types intelligently.
        """
        from .models import Policy, PolicyInstallment, PolicyType

        if policy.status != Policy.Status.PAID_PENDING_ACTIVATION:
            raise ValueError(f"Policy cannot be activated. Status must be 'Paid - Pending Activation'.")

        policy.insurance_certificate_number = insurance_certificate_number
        update_fields = ['status', 'insurance_certificate_number', 'updated_at']
        if start_date: policy.policy_start_date = start_date; update_fields.append('policy_start_date')
        if end_date: policy.policy_end_date = end_date; update_fields.append('policy_end_date')

        # --- FIX: Route activation logic based on payment structure ---
        if policy.policy_type.payment_structure == PolicyType.PaymentStructure.RECURRING_FEE:
            policy.status = Policy.Status.ACTIVE_RECURRING
            
            if not policy.payment_frequency:
                raise ValueError("Cannot activate recurring policy without a payment frequency.")
            
            frequency_map = {
                Policy.PaymentFrequency.MONTHLY: relativedelta(months=1),
                Policy.PaymentFrequency.QUARTERLY: relativedelta(months=3),
                Policy.PaymentFrequency.SEMI_ANNUALLY: relativedelta(months=6),
                Policy.PaymentFrequency.ANNUALLY: relativedelta(years=1),
            }
            # Calculate the first 'next_due_date' based on the policy's start date.
            base_date = policy.policy_start_date
            policy.next_due_date = base_date + frequency_map[policy.payment_frequency]
            update_fields.append('next_due_date')
            # NOTE: Upfront commission for the entire policy is not generated for recurring types.
            # Commission should be handled per-payment.

        elif not policy.is_installment: # For Premium-Based, non-installment
            policy.status = Policy.Status.ACTIVE
            # The AttributeError originated here. Ensure you have fixed `commissions.services.py`.
            CommissionService.generate_for_policy(policy)
        else: # For Premium-Based, installment
            policy.status = Policy.Status.ACTIVE_INSTALLMENT
            paid_installments = policy.installments.filter(status=PolicyInstallment.Status.PAID)
            
            if not paid_installments.exists():
                raise ValueError("Cannot activate an installment policy with no paid installments.")

            for installment in paid_installments:
                if not StaffCommission.objects.filter(installment=installment).exists():
                    CommissionService.generate_for_installment(installment)

        policy.save(update_fields=update_fields)
        return policy

    @staticmethod
    @transaction.atomic
    def record_payment_for_policy(policy, amount: Decimal, transaction_reference: str):
        """Records a partial or full payment for a NON-INSTALLMENT, PREMIUM-BASED policy."""
        from .models import Policy
        if policy.is_installment:
            raise ValueError("This payment method is for non-installment policies only.")
        if policy.status not in [Policy.Status.AWAITING_PAYMENT, Policy.Status.PARTIALLY_PAID]:
            raise ValueError(f"Payments can only be recorded for policies awaiting payment. Current status: {policy.get_status_display()}")
        if amount > policy.balance_due:
            raise ValueError(f"Payment amount ({amount}) exceeds the balance due ({policy.balance_due}).")

        CustomerPayment.objects.create(customer=policy.customer, policy=policy, amount=amount, mpesa_reference=transaction_reference, payment_date=timezone.now())
        policy.refresh_from_db()

        if policy.amount_paid >= policy.premium_amount:
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
        else:
            policy.status = Policy.Status.PARTIALLY_PAID
        policy.save(update_fields=['status', 'updated_at'])
        return policy

    @staticmethod
    @transaction.atomic
    def record_installment_payment(installment, paid_on: datetime.date, transaction_reference: str):
        """Records a payment for an installment and updates the parent policy's lifecycle."""
        from .models import Policy, PolicyInstallment

        if installment.status == PolicyInstallment.Status.PAID:
            raise ValueError("This installment has already been paid.")

        installment.status = PolicyInstallment.Status.PAID; installment.paid_on = paid_on; installment.transaction_reference = transaction_reference
        installment.save()
        policy = installment.policy

        is_first_payment = not policy.installments.filter(status=PolicyInstallment.Status.PAID).exclude(pk=installment.pk).exists()
        if is_first_payment and policy.status == Policy.Status.AWAITING_PAYMENT:
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
        
        if policy.status in [Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.AT_RISK_MISSING_PAYMENT]:
            CommissionService.generate_for_installment(installment)

        if policy.status == Policy.Status.AT_RISK_MISSING_PAYMENT and not policy.installments.filter(status=PolicyInstallment.Status.OVERDUE).exists():
            policy.status = Policy.Status.ACTIVE_INSTALLMENT
        
        if not policy.installments.filter(status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE]).exists():
            policy.status = Policy.Status.ACTIVE
        
        policy.save(update_fields=['status', 'updated_at'])
        return installment

    @staticmethod
    @transaction.atomic
    def record_recurring_payment(policy, amount: Decimal, transaction_reference: str):
        """Records a payment for a recurring policy and updates its lifecycle state."""
        from .models import Policy, PolicyType

        if policy.policy_type.payment_structure != PolicyType.PaymentStructure.RECURRING_FEE:
            raise ValueError("This payment method is for recurring fee policies only.")

        # --- FIX: Handle initial vs. subsequent payments for recurring policies ---
        if policy.status == Policy.Status.AWAITING_PAYMENT:
            # This is the FIRST payment. Move to pending activation.
            CustomerPayment.objects.create(customer=policy.customer, policy=policy, amount=amount, mpesa_reference=transaction_reference, payment_date=timezone.now())
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
            policy.save(update_fields=['status', 'updated_at'])
            # next_due_date is set upon activation, not here.

        elif policy.status in [Policy.Status.ACTIVE_RECURRING, Policy.Status.AT_RISK_MISSING_PAYMENT]:
            # This is a SUBSEQUENT payment for an active policy.
            if not policy.payment_frequency:
                raise ValueError("Policy is missing payment_frequency.")

            CustomerPayment.objects.create(customer=policy.customer, policy=policy, amount=amount, mpesa_reference=transaction_reference, payment_date=timezone.now())

            frequency_map = {
                Policy.PaymentFrequency.MONTHLY: relativedelta(months=1),
                Policy.PaymentFrequency.QUARTERLY: relativedelta(months=3),
                Policy.PaymentFrequency.SEMI_ANNUALLY: relativedelta(months=6),
                Policy.PaymentFrequency.ANNUALLY: relativedelta(years=1),
            }
            base_date = max(datetime.date.today(), policy.next_due_date) if policy.next_due_date else datetime.date.today()
            policy.next_due_date = base_date + frequency_map[policy.payment_frequency]
            policy.status = Policy.Status.ACTIVE_RECURRING
            
            policy.save(update_fields=['status', 'next_due_date', 'updated_at'])
            # Commission logic for subsequent payments would be triggered here.
        else:
            raise ValueError(f"Payments cannot be recorded for a recurring policy with status '{policy.get_status_display()}'.")
        
        return policy


class PaymentSimulationService:
    @staticmethod
    @transaction.atomic
    def simulate_payment(item_type: str, item_id: str, user: "User", amount: Decimal = None) -> dict:
        from .models import Policy, PolicyInstallment, PolicyType
        mpesa_ref = f"SIM_{uuid.uuid4().hex[:10].upper()}"
        
        if item_type == 'POLICY':
            try:
                policy = Policy.objects.select_related('policy_type').get(pk=item_id)
            except Policy.DoesNotExist:
                raise exceptions.NotFound("Policy does not exist.")

            if policy.policy_type.payment_structure == PolicyType.PaymentStructure.RECURRING_FEE:
                payment_amount = amount if amount is not None else policy.premium_amount
                if payment_amount <= 0:
                    raise exceptions.ValidationError("Payment amount for recurring policy must be positive.")
                
                PolicyService.record_recurring_payment(policy=policy, amount=payment_amount, transaction_reference=mpesa_ref)
                policy.refresh_from_db()
                return {"message": f"Successfully simulated recurring payment of {payment_amount} for policy {policy.policy_number}. New status: '{policy.get_status_display()}'."}

            else:
                if policy.is_installment:
                    raise exceptions.ValidationError("For installment policies, please simulate payment on a specific installment.")
                
                payment_amount = amount if amount is not None else policy.balance_due
                if payment_amount <= 0:
                    raise exceptions.ValidationError("Policy has been fully paid or amount is invalid.")
                
                PolicyService.record_payment_for_policy(policy=policy, amount=payment_amount, transaction_reference=mpesa_ref)
                policy.refresh_from_db()
                return {"message": f"Successfully simulated payment of {payment_amount} for policy {policy.policy_number}. New status: '{policy.get_status_display()}'."}

        elif item_type == 'INSTALLMENT':
            try:
                installment = PolicyInstallment.objects.select_related('policy').get(pk=item_id, status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE])
            except PolicyInstallment.DoesNotExist:
                raise exceptions.NotFound("This installment is not pending payment or does not exist.")
            if amount and amount != installment.amount:
                 raise exceptions.ValidationError(f"Partial payments are not supported for installments. Please pay the full amount: {installment.amount}.")
            
            PolicyService.record_installment_payment(installment=installment, paid_on=timezone.now().date(), transaction_reference=mpesa_ref)
            return {"message": f"Successfully simulated payment for installment on policy {installment.policy.policy_number}."}
        else:
            raise exceptions.ValidationError("Invalid item_type specified.")