# apps/commissions/tasks.py
from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
import logging
import re

# --- REMOVED: All model and service imports from the top of the file ---

logger = logging.getLogger(__name__)

# Regex to identify an installment payment reference
INSTALLMENT_REF_RE = re.compile(r"^(.*)-INST-([a-f0-9]{8})$")

@shared_task(name="process_c2b_payment")
def process_c2b_payment(payload: dict):
    """
    Processes a payment webhook payload.
    It can handle payments for a full policy OR for a specific policy installment.
    """
    # --- FIX: Moved CustomerPayment import inside the function ---
    from apps.commissions.models import CustomerPayment

    mpesa_ref = payload.get('TransID')
    bill_ref = payload.get('BillRefNumber')
    amount_str = payload.get('TransAmount')
    
    if not all([mpesa_ref, bill_ref, amount_str]):
        logger.error(f"Invalid webhook payload. Missing required fields: {payload}")
        return

    if CustomerPayment.objects.filter(mpesa_reference=mpesa_ref).exists():
        logger.warning(f"Duplicate M-Pesa transaction received: {mpesa_ref}. Ignoring.")
        return
    
    try:
        amount = Decimal(amount_str)
    except Exception:
        logger.error(f"Could not parse 'TransAmount' to Decimal. Value: '{amount_str}'.")
        return

    installment_match = INSTALLMENT_REF_RE.match(bill_ref)
    if installment_match:
        _process_installment_payment(mpesa_ref, amount, installment_match)
    else:
        _process_full_policy_payment(mpesa_ref, amount, bill_ref)

def _process_installment_payment(mpesa_ref: str, amount: Decimal, match):
    """Handles logic for an installment payment."""
    # --- FIX: Moved imports inside the function ---
    from apps.policies.models import PolicyInstallment
    from apps.policies.services import PolicyService
    from apps.commissions.models import CustomerPayment

    policy_number, installment_id_prefix = match.groups()
    try:
        installment = PolicyInstallment.objects.select_related('policy__customer').get(
            policy__policy_number=policy_number,
            id__startswith=installment_id_prefix,
            status__in=[PolicyInstallment.Status.PENDING, PolicyInstallment.Status.OVERDUE]
        )
    except PolicyInstallment.DoesNotExist:
        logger.error(f"Unmatched Installment: No pending installment found for BillRef: '{match.string}'")
        return
    
    if not (abs(amount - installment.amount) < Decimal('1.00')):
        logger.warning(f"Installment amount mismatch for {installment.id}. Expected: {installment.amount}, Received: {amount}. Flagging.")
        return
        
    try:
        with transaction.atomic():
            CustomerPayment.objects.create(
                customer=installment.policy.customer,
                policy=installment.policy,
                amount=amount,
                mpesa_reference=mpesa_ref,
                payment_date=timezone.now()
            )
            PolicyService.record_installment_payment(
                installment,
                paid_on=timezone.now().date(),
                transaction_ref=mpesa_ref
            )
        logger.info(f"Successfully processed installment payment for {installment.id} on policy {installment.policy.policy_number}.")
        _send_payment_notification(installment.policy)
    except Exception as e:
        logger.critical(f"DATABASE ERROR during installment payment processing for {installment.id}: {e}. Retrying.")
        raise

def _process_full_policy_payment(mpesa_ref: str, amount: Decimal, bill_ref: str):
    """Handles logic for a full, one-time policy premium payment."""
    # --- FIX: Moved imports inside the function ---
    from apps.policies.models import Policy
    from apps.commissions.models import CustomerPayment

    try:
        policy = Policy.objects.get(
            Q(policy_number__iexact=bill_ref) | Q(vehicle_registration_number__iexact=bill_ref)
        )
    except Policy.DoesNotExist:
        logger.error(f"Unmatched Payment: No policy found for BillRefNumber: '{bill_ref}'")
        return
    except Policy.MultipleObjectsReturned:
        logger.error(f"Unmatched Payment: Multiple policies for BillRefNumber: '{bill_ref}'")
        return

    if policy.status != Policy.Status.AWAITING_PAYMENT:
        logger.warning(f"Payment received for policy {policy.policy_number} which is not 'Awaiting Payment'. Status: '{policy.status}'.")
        return

    if not (abs(amount - policy.total_premium_amount) < Decimal('1.00')):
        logger.warning(f"Payment amount mismatch for {policy.policy_number}. Expected: {policy.total_premium_amount}, Received: {amount}.")
        return
        
    try:
        with transaction.atomic():
            CustomerPayment.objects.create(
                customer=policy.customer,
                policy=policy,
                amount=amount,
                mpesa_reference=mpesa_ref,
                payment_date=timezone.now()
            )
            policy.status = Policy.Status.PAID_PENDING_ACTIVATION
            policy.save(update_fields=['status'])
        logger.info(f"Successfully processed full payment for policy {policy.policy_number}. Status updated to 'Paid - Pending Activation'.")
        _send_payment_notification(policy)
    except Exception as e:
        logger.critical(f"DATABASE ERROR during full payment processing for {policy.policy_number}: {e}. Retrying.")
        raise

def _send_payment_notification(policy: "Policy"):
    """Creates an in-app notification for the agent after a payment."""
    # --- FIX: Moved imports inside the function ---
    from apps.communications.models import Notification

    try:
        agent = policy.agent
        if agent:
            message = (f"Payment received for policy {policy.policy_number}. "
                       f"The policy is now ready for activation.")
            if policy.is_installment:
                 message = (f"An installment payment was received for policy {policy.policy_number}. "
                            f"The policy is now active.")
            
            Notification.objects.create(user=agent, policy=policy, message=message)
            logger.info(f"Created payment notification for agent {agent.email} for policy {policy.policy_number}.")
        else:
            logger.warning(f"No agent assigned to policy {policy.policy_number}. Notification not sent.")
    except Exception as e:
        logger.error(f"Failed to create notification for policy {policy.policy_number}: {e}")