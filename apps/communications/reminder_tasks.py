# apps/communications/reminder_tasks.py

from celery import shared_task
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Q, Count
import logging

from apps.policies.models import Policy, PolicyInstallment
from apps.customers.models import Customer
from apps.accounts.models import User, AGENT, BRANCH_MANAGER
from .reminder_services import ReminderService
from .reminder_models import ReminderType

logger = logging.getLogger(__name__)


# =====================================================
# CUSTOMER REMINDER TASKS
# =====================================================

@shared_task(name="apps.communications.tasks.send_customer_payment_reminders")
def send_customer_payment_reminders():
    """
    Daily task to send payment reminders to customers 3 days before payment is due.
    Runs at 9:00 AM daily.
    """
    logger.info("Starting customer payment reminders task...")
    reminder_service = ReminderService()
    three_days_from_now = date.today() + timedelta(days=3)
    
    # Find installments due in 3 days
    upcoming_installments = PolicyInstallment.objects.filter(
        due_date=three_days_from_now,
        status=PolicyInstallment.Status.PENDING
    ).select_related('policy', 'policy__customer', 'policy__policy_type')
    
    count = 0
    for installment in upcoming_installments:
        policy = installment.policy
        customer = policy.customer
        
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.PAYMENT_DUE,
                customer=customer,
                policy=policy,
                send_sms=True,
                send_email=True,
                installment_amount=f"{installment.amount:,.2f}",
                due_date=installment.due_date.strftime('%d-%b-%Y')
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send payment reminder for installment {installment.id}: {e}")
    
    # Also check for recurring policies with next_due_date in 3 days
    recurring_policies = Policy.objects.filter(
        next_due_date=three_days_from_now,
        status__in=[Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in recurring_policies:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.PAYMENT_DUE,
                customer=policy.customer,
                policy=policy,
                send_sms=True,
                send_email=True
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send payment reminder for policy {policy.id}: {e}")
    
    logger.info(f"Sent {count} payment due reminders")
    return f"Sent {count} payment due reminders"


@shared_task(name="apps.communications.tasks.send_customer_overdue_reminders")
def send_customer_overdue_reminders():
    """
    Daily task to send overdue payment reminders.
    Escalates: Day 1 (SMS+Email), Day 3 (SMS), Day 7 (SMS+Email)
    Runs at 10:00 AM daily.
    """
    logger.info("Starting customer overdue payment reminders task...")
    reminder_service = ReminderService()
    today = date.today()
    
    # Day 1 overdue
    day1_date = today - timedelta(days=1)
    day3_date = today - timedelta(days=3)
    day7_date = today - timedelta(days=7)
    
    count = 0
    
    # Day 1: SMS + Email
    day1_installments = PolicyInstallment.objects.filter(
        due_date=day1_date,
        status=PolicyInstallment.Status.OVERDUE
    ).select_related('policy', 'policy__customer')
    
    for installment in day1_installments:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.PAYMENT_OVERDUE,
                customer=installment.policy.customer,
                policy=installment.policy,
                send_sms=True,
                send_email=True,
                days_overdue="1",
                installment_amount=f"{installment.amount:,.2f}"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send day-1 overdue reminder: {e}")
    
    # Day 3: SMS only
    day3_installments = PolicyInstallment.objects.filter(
        due_date=day3_date,
        status=PolicyInstallment.Status.OVERDUE
    ).select_related('policy', 'policy__customer')
    
    for installment in day3_installments:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.PAYMENT_OVERDUE,
                customer=installment.policy.customer,
                policy=installment.policy,
                send_sms=True,
                send_email=False,  # SMS only
                days_overdue="3",
                installment_amount=f"{installment.amount:,.2f}"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send day-3 overdue reminder: {e}")
    
    # Day 7: SMS + Email (escalated)
    day7_installments = PolicyInstallment.objects.filter(
        due_date=day7_date,
        status=PolicyInstallment.Status.OVERDUE
    ).select_related('policy', 'policy__customer')
    
    for installment in day7_installments:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.PAYMENT_OVERDUE,
                customer=installment.policy.customer,
                policy=installment.policy,
                send_sms=True,
                send_email=True,
                days_overdue="7",
                installment_amount=f"{installment.amount:,.2f}"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send day-7 overdue reminder: {e}")
    
    logger.info(f"Sent {count} overdue payment reminders")
    return f"Sent {count} overdue payment reminders"


@shared_task(name="apps.communications.tasks.send_customer_policy_expiry_reminders")
def send_customer_policy_expiry_reminders():
    """
    Daily task to send policy expiry reminders.
    Sends at: 14 days (Email), 7 days (SMS+Email), 3 days (SMS+Email)
    Runs at 9:30 AM daily.
    """
    logger.info("Starting customer policy expiry reminders task...")
    reminder_service = ReminderService()
    today = date.today()
    
    count = 0
    
    # 14 days before expiry - Email only
    date_14d = today + timedelta(days=14)
    policies_14d = Policy.objects.filter(
        policy_end_date=date_14d,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in policies_14d:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.POLICY_EXPIRING,
                customer=policy.customer,
                policy=policy,
                send_sms=False,  # Email only
                send_email=True,
                days_until_expiry="14"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send 14-day expiry reminder for policy {policy.id}: {e}")
    
    # 7 days before expiry - SMS + Email
    date_7d = today + timedelta(days=7)
    policies_7d = Policy.objects.filter(
        policy_end_date=date_7d,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in policies_7d:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.POLICY_EXPIRING,
                customer=policy.customer,
                policy=policy,
                send_sms=True,
                send_email=True,
                days_until_expiry="7"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send 7-day expiry reminder for policy {policy.id}: {e}")
    
    # 3 days before expiry - SMS + Email
    date_3d = today + timedelta(days=3)
    policies_3d = Policy.objects.filter(
        policy_end_date=date_3d,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in policies_3d:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.POLICY_EXPIRING,
                customer=policy.customer,
                policy=policy,
                send_sms=True,
                send_email=True,
                days_until_expiry="3"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send 3-day expiry reminder for policy {policy.id}: {e}")

    # 2 days before expiry - SMS + Email
    date_2d = today + timedelta(days=2)
    policies_2d = Policy.objects.filter(
        policy_end_date=date_2d,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in policies_2d:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.POLICY_EXPIRING,
                customer=policy.customer,
                policy=policy,
                send_sms=True,
                send_email=True,
                days_until_expiry="2"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send 2-day expiry reminder for policy {policy.id}: {e}")

    # 1 day before expiry - SMS + Email (Urgent)
    date_1d = today + timedelta(days=1)
    policies_1d = Policy.objects.filter(
        policy_end_date=date_1d,
        status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
    ).select_related('customer', 'policy_type')
    
    for policy in policies_1d:
        try:
            reminder_service.send_customer_reminder(
                reminder_type=ReminderType.POLICY_EXPIRING,
                customer=policy.customer,
                policy=policy,
                send_sms=True,
                send_email=True,
                days_until_expiry="1"
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send 1-day expiry reminder for policy {policy.id}: {e}")
    
    logger.info(f"Sent {count} policy expiry reminders")
    return f"Sent {count} policy expiry reminders"


# =====================================================
# AGENT REMINDER TASKS
# =====================================================

@shared_task(name="apps.communications.tasks.send_agent_daily_summary")
def send_agent_daily_summary():
    """
    Send daily portfolio summary to agents.
    Runs Monday-Friday at 8:00 AM.
    """
    logger.info("Starting agent daily summary task...")
    reminder_service = ReminderService()
    
    # Get all active agents and managers
    agents = User.objects.filter(
        is_active=True,
        groups__name__in=[AGENT, BRANCH_MANAGER]
    ).distinct()
    
    count = 0
    today = date.today()
    
    for agent in agents:
        # Get agent's portfolio stats
        active_policies = Policy.objects.filter(
            agent=agent,
            status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
        ).count()
        
        overdue_policies = Policy.objects.filter(
            agent=agent,
            status=Policy.Status.AT_RISK_MISSING_PAYMENT
        ).count()
        
        expiring_this_month = Policy.objects.filter(
            agent=agent,
            policy_end_date__year=today.year,
            policy_end_date__month=today.month,
            status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
        ).count()
        
        # Only send if there's meaningful data
        if active_policies > 0 or overdue_policies > 0:
            try:
                reminder_service.send_agent_reminder(
                    reminder_type=ReminderType.AGENT_DAILY_SUMMARY,
                    agent=agent,
                    send_sms=False,  # Email only for summaries
                    send_email=True,
                    active_policies_count=str(active_policies),
                    overdue_policies_count=str(overdue_policies),
                    expiring_this_month_count=str(expiring_this_month),
                    summary_date=today.strftime('%d-%b-%Y')
                )
                count += 1
            except Exception as e:
                logger.error(f"Failed to send daily summary to agent {agent.id}: {e}")
    
    logger.info(f"Sent {count} agent daily summaries")
    return f"Sent {count} agent daily summaries"


@shared_task(name="apps.communications.tasks.send_agent_urgent_alerts")
def send_agent_urgent_alerts():
    """
    Send urgent alerts to agents about policies needing attention.
    Runs every 6 hours.
    """
    logger.info("Starting agent urgent alerts task...")
    reminder_service = ReminderService()
    
    # Find policies that became AT_RISK in the last 6 hours
    six_hours_ago = timezone.now() - timedelta(hours=6)
    
    at_risk_policies = Policy.objects.filter(
        status=Policy.Status.AT_RISK_MISSING_PAYMENT,
        updated_at__gte=six_hours_ago
    ).select_related('agent', 'customer')
    
    # Group by agent
    agent_policies = {}
    for policy in at_risk_policies:
        if policy.agent_id not in agent_policies:
            agent_policies[policy.agent_id] = []
        agent_policies[policy.agent_id].append(policy)
    
    count = 0
    for agent_id, policies in agent_policies.items():
        agent = User.objects.get(id=agent_id)
        policy_numbers = ', '.join([p.policy_number for p in policies[:5]])  # First 5
        
        try:
            reminder_service.send_agent_reminder(
                reminder_type=ReminderType.AGENT_URGENT_ALERT,
                agent=agent,
                send_sms=True,
                send_email=True,
                at_risk_count=str(len(policies)),
                policy_numbers=policy_numbers
            )
            count += 1
        except Exception as e:
            logger.error(f"Failed to send urgent alert to agent {agent.id}: {e}")
    
    logger.info(f"Sent {count} urgent alerts to agents")
    return f"Sent {count} urgent alerts to agents"


@shared_task(name="apps.communications.tasks.send_agent_renewal_opportunities")
def send_agent_renewal_opportunities():
    """
    Send weekly renewal opportunities report to agents.
    Lists policies expiring in 30-60 days.
    Runs every Monday at 9:00 AM.
    """
    logger.info("Starting agent renewal opportunities task...")
    reminder_service = ReminderService()
    today = date.today()
    
    start_date = today + timedelta(days=30)
    end_date = today + timedelta(days=60)
    
    # Get all agents
    agents = User.objects.filter(
        is_active=True,
        groups__name__in=[AGENT]
    ).distinct()
    
    count = 0
    for agent in agents:
        # Find policies expiring in 30-60 days
        renewal_opportunities = Policy.objects.filter(
            agent=agent,
            policy_end_date__gte=start_date,
            policy_end_date__lte=end_date,
            status__in=[Policy.Status.ACTIVE, Policy.Status.ACTIVE_INSTALLMENT, Policy.Status.ACTIVE_RECURRING]
        ).select_related('customer')
        
        if renewal_opportunities.exists():
            opportunity_count = renewal_opportunities.count()
            # Create a list of customer names and expiry dates
            opportunities_list = '\n'.join([
                f"- {p.customer.first_name} {p.customer.last_name}: {p.policy_number} expires {p.policy_end_date.strftime('%d-%b')}"
                for p in renewal_opportunities[:10]  # First 10
            ])
            
            try:
                reminder_service.send_agent_reminder(
                    reminder_type=ReminderType.AGENT_RENEWAL_OPP,
                    agent=agent,
                    send_sms=False,  # Email only for detailed reports
                    send_email=True,
                    opportunity_count=str(opportunity_count),
                    opportunities_list=opportunities_list
                )
                count += 1
            except Exception as e:
                logger.error(f"Failed to send renewal opportunities to agent {agent.id}: {e}")
    
    logger.info(f"Sent {count} renewal opportunity reports")
    return f"Sent {count} renewal opportunity reports"
