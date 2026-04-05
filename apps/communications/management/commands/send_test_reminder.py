# apps/communications/management/commands/send_test_reminder.py

from django.core.management.base import BaseCommand
from apps.customers.models import Customer
from apps.accounts.models import User
from apps.policies.models import Policy
from apps.communications.reminder_services import ReminderService
from apps.communications.reminder_models import ReminderType
import uuid

class Command(BaseCommand):
    help = 'Sends a test reminder to a customer or agent for testing purposes'

    def add_arguments(self, parser):
        parser.add_argument('--type', type=str, required=True, 
                            choices=[t[0] for t in ReminderType.choices],
                            help='Type of reminder to send')
        parser.add_argument('--customer-id', type=str, help='UUID of the customer recipient')
        parser.add_argument('--agent-id', type=str, help='UUID of the agent recipient')
        parser.add_argument('--policy-id', type=str, help='UUID of the policy (optional)')
        parser.add_argument('--sms', action='store_true', help='Force send SMS')
        parser.add_argument('--email', action='store_true', help='Force send Email')

    def handle(self, *args, **options):
        reminder_type = options['type']
        customer_id = options['customer_id']
        agent_id = options['agent_id']
        policy_id = options['policy_id']
        force_sms = options['sms']
        force_email = options['email']
        
        # If neither is specified, send both by default for testing
        if not force_sms and not force_email:
            force_sms = True
            force_email = True

        service = ReminderService()
        policy = None
        if policy_id:
            try:
                policy = Policy.objects.get(id=policy_id)
            except Policy.DoesNotExist:
                self.stderr.write(f"Policy {policy_id} not found")
                return

        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
                self.stdout.write(f"Sending {reminder_type} reminder to customer {customer}...")
                
                log = service.send_customer_reminder(
                    reminder_type=reminder_type,
                    customer=customer,
                    policy=policy,
                    send_sms=force_sms,
                    send_email=force_email,
                    force=True, # Force skip duplicate check for testing
                    days_overdue="5", # Sample value
                    installment_amount="1,500.00", # Sample value
                    days_until_expiry="7" # Sample value
                )
                
                if log:
                    self.stdout.write(self.style.SUCCESS(f"Successfully sent! Log ID: {log.id}"))
                else:
                    self.stderr.write("Failed to send: Check if template exists and is active")
                    
            except Customer.DoesNotExist:
                self.stderr.write(f"Customer {customer_id} not found")
                
        elif agent_id:
            try:
                agent = User.objects.get(id=agent_id)
                self.stdout.write(f"Sending {reminder_type} reminder to agent {agent}...")
                
                log = service.send_agent_reminder(
                    reminder_type=reminder_type,
                    agent=agent,
                    policy=policy,
                    send_sms=force_sms,
                    send_email=force_email,
                    force=True,
                    active_policies_count="42",
                    overdue_policies_count="5",
                    expiring_this_month_count="8",
                    at_risk_count="3",
                    policy_numbers="POL-123, POL-456",
                    opportunity_count="12",
                    opportunities_list="- Customer A: Exp June 5\n- Customer B: Exp June 12",
                    summary_date="Today"
                )
                
                if log:
                    self.stdout.write(self.style.SUCCESS(f"Successfully sent! Log ID: {log.id}"))
                else:
                    self.stderr.write("Failed to send: Check if template exists and is active")
                    
            except User.DoesNotExist:
                self.stderr.write(f"Agent {agent_id} not found")
        else:
            self.stderr.write("You must specify either --customer-id or --agent-id")
