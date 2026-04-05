# apps/policies/tasks.py

from celery import shared_task
from datetime import date, timedelta
from django.db.models import F
from .models import Policy, PolicyInstallment, PolicyType
from apps.core.services import AfricasTalkingService  # Assuming this service exists for SMS
import logging

# It's good practice to have a logger for your tasks to see output in Celery logs.
logger = logging.getLogger(__name__)


# --- TASK 1: SEND A SINGLE SMS (SUB-TASK) ---

@shared_task(name="apps.policies.tasks.send_single_expiry_sms")
def send_single_expiry_sms(policy_id: str):
    """
    A sub-task to send an SMS for a single expiring policy.
    The message content is customized based on policy details.
    """
    try:
        policy = Policy.objects.select_related('customer').get(id=policy_id)
        customer_phone = policy.customer.phone
        customer_name = policy.customer.first_name
        
        if not customer_phone:
            logger.warning(f"Policy {policy.policy_number} has no customer phone number. Skipping SMS.")
            return

        if policy.vehicle_registration_number:
            policy_subject = f"policy for vehicle {policy.vehicle_registration_number}"
        else:
            policy_subject = f"policy {policy.policy_number}"

        installment_clause = ", which is on an installment plan," if policy.is_installment else ""

        message = (
            f"Hello {customer_name}, your insurance {policy_subject}{installment_clause} "
            f"is expiring on {policy.policy_end_date.strftime('%d-%b-%Y')}. "
            f"Please contact us to renew."
        )

        sms_service = AfricasTalkingService()
        sms_service.send_sms(recipient=customer_phone, message=message)
        logger.info(f"Successfully queued expiry SMS for policy {policy.policy_number}")

    except Policy.DoesNotExist:
        logger.error(f"Policy with ID {policy_id} not found for sending SMS.")
    except Exception as e:
        logger.error(f"An unexpected error occurred in send_single_expiry_sms for policy {policy_id}: {e}")
        raise


# --- TASK 2: FIND POLICIES EXPIRING SOON (MAIN PERIODIC TASK) ---

@shared_task(name="apps.policies.tasks.send_daily_policy_expiry_reminders")
def send_daily_policy_expiry_reminders():
    """
    A periodic task that finds all policies expiring in exactly 5 days
    and queues individual SMS sending tasks for each one.
    """
    logger.info("Starting daily policy expiry reminder task...")
    five_days_from_now = date.today() + timedelta(days=5)
    
    expiring_policies = Policy.objects.filter(
        policy_end_date=five_days_from_now,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT]
    ).values_list('id', flat=True)

    policy_ids = list(expiring_policies)
    if not policy_ids:
        logger.info("No policies expiring in 5 days. Task finished.")
        return

    logger.info(f"Found {len(policy_ids)} policies expiring in 5 days. Queuing SMS tasks...")
    for policy_id in policy_ids:
        send_single_expiry_sms.delay(str(policy_id))
    logger.info("Finished queuing all expiry SMS tasks.")


# --- TASK 3: UPDATE STATUS OF EXPIRED POLICIES ---

@shared_task(name="apps.policies.tasks.update_expired_policies_status")
def update_expired_policies_status():
    """
    A daily task to find and update policies that have expired.
    """
    today = date.today()
    logger.info(f"Starting daily task to update expired policies for {today}...")

    policies_to_expire = Policy.objects.filter(
        policy_end_date__lt=today,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.AT_RISK_MISSING_PAYMENT, Policy.Status.ACTIVE_RECURRING]
    )
    expired_count = policies_to_expire.count()

    if expired_count == 0:
        logger.info("No active policies found that have expired. Task finished.")
        return

    policies_to_expire.update(status=Policy.Status.EXPIRED)
    logger.info(f"Successfully updated {expired_count} policies to 'EXPIRED' status.")


# --- TASK 4: UPDATE OVERDUE INSTALLMENTS ---

@shared_task(name="apps.policies.tasks.update_overdue_installments")
def update_overdue_installments():
    """
    A daily task to find installments that are past their due date and update their
    status to 'OVERDUE'. It also updates the parent policy's status to 'AT_RISK'.
    """
    today = date.today()
    logger.info(f"Starting daily task to update overdue installments for {today}...")

    installments_to_mark_overdue = PolicyInstallment.objects.filter(
        due_date__lt=today,
        status=PolicyInstallment.Status.PENDING
    )
    overdue_count = installments_to_mark_overdue.count()
    if overdue_count > 0:
        installments_to_mark_overdue.update(status=PolicyInstallment.Status.OVERDUE)
        logger.info(f"Successfully updated {overdue_count} installments to 'OVERDUE' status.")

    policies_to_flag = Policy.objects.filter(
        status=Policy.Status.ACTIVE_INSTALLMENT,
        installments__status=PolicyInstallment.Status.OVERDUE
    ).distinct()
    flagged_count = policies_to_flag.count()
    if flagged_count > 0:
        policies_to_flag.update(status=Policy.Status.AT_RISK_MISSING_PAYMENT)
        logger.info(f"Successfully flagged {flagged_count} policies as 'AT_RISK_MISSING_PAYMENT'.")


# --- TASK 5: UPDATE AT-RISK RECURRING POLICIES ---

@shared_task(name="apps.policies.tasks.update_at_risk_recurring_policies")
def update_at_risk_recurring_policies():
    """
    A daily task that finds active recurring policies where the next_due_date
    is in the past, and marks them as 'AT_RISK_MISSING_PAYMENT'.
    """
    today = date.today()
    logger.info(f"Starting daily task to check for overdue recurring policies for {today}...")

    policies_to_flag = Policy.objects.filter(
        policy_type__payment_structure=PolicyType.PaymentStructure.RECURRING_FEE,
        status=Policy.Status.ACTIVE_RECURRING,
        next_due_date__lt=today
    )
    flagged_count = policies_to_flag.count()
    if flagged_count > 0:
        policies_to_flag.update(status=Policy.Status.AT_RISK_MISSING_PAYMENT)
        logger.info(f"Successfully flagged {flagged_count} recurring policies as 'AT_RISK'.")
    else:
        logger.info("No overdue recurring policies found.")