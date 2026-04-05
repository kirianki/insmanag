# apps/policies/management/commands/create_test_policy.py

import sys
from django.core.management.base import BaseCommand, CommandError
from datetime import date, timedelta
from apps.policies.models import Policy, PolicyType, InsuranceProvider
from apps.customers.models import Customer
from apps.accounts.models import User

class Command(BaseCommand):
    help = 'Creates a test policy that will expire in exactly 5 days for a specified phone number.'

    def add_arguments(self, parser):
        parser.add_argument('phone_number', type=str, help="The test customer's phone number in international format (e.g., +254712345678).")

    def handle(self, *args, **options):
        phone_number = options['phone_number']
        self.stdout.write(self.style.SUCCESS(f"--- Starting test policy creation for {phone_number} ---"))

        # 1. Calculate the target expiry date
        expiry_date = date.today() + timedelta(days=5)
        self.stdout.write(f"Target expiry date will be: {expiry_date}")

        # 2. Get a customer and update their phone number for the test
        customer = Customer.objects.first()
        if not customer:
            raise CommandError("ERROR: No customers found. Please create a customer first.")

        self.stdout.write(f"Using customer: {customer}. Updating phone to {phone_number}")
        customer.phone = phone_number
        customer.save()

        # 3. Get other required objects
        provider = InsuranceProvider.objects.first()
        policy_type = PolicyType.objects.first()
        agent = User.objects.filter(groups__name='Agent').first()

        if not all([provider, policy_type, agent]):
            raise CommandError("ERROR: Could not find a Provider, PolicyType, or Agent. Please ensure at least one of each exists.")

        # 4. Create the test policy
        try:
            test_policy = Policy.objects.create(
                customer=customer,
                provider=provider,
                policy_type=policy_type,
                agent=agent,
                total_premium_amount=5000,
                policy_start_date=date.today(),
                policy_end_date=expiry_date,
                status=Policy.Status.ACTIVE  # Must be an active policy
            )
            self.stdout.write(self.style.SUCCESS("\n--- SUCCESS! ---"))
            self.stdout.write(f"Created new test policy: {test_policy.policy_number}")
            self.stdout.write(f"This policy expires on {test_policy.policy_end_date} for customer with phone {customer.phone}")
            self.stdout.write(self.style.SUCCESS("------------------"))
        except Exception as e:
            raise CommandError(f"Failed to create policy. Error: {e}")