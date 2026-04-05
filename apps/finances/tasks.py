from celery import shared_task
from django.utils import timezone
from .models import Expense
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_recurring_expenses_task():
    """
    Processes all recurring expenses and generates new ones if due.
    This task should be scheduled to run daily (e.g. at midnight).
    """
    today = timezone.localdate()
    
    # Find recurring expenses where next_due_date is in the past or today
    expenses_to_process = Expense.objects.filter(
        is_recurring=True,
        next_due_date__lte=today
    )
    
    created_count = 0
    with transaction.atomic():
        for exp in expenses_to_process:
            try:
                # 1. Store the next due date as the NEW date_incurred
                new_date = exp.next_due_date
                
                # 2. Create the NEW record
                # We clone the expense but mark it as the active recurring one
                new_expense = Expense.objects.create(
                    agency=exp.agency,
                    branch=exp.branch,
                    category=exp.category,
                    amount=exp.amount,
                    date_incurred=new_date,
                    description=exp.description,
                    frequency=exp.frequency,
                    is_recurring=True,
                    recorded_by=exp.recorded_by
                )
                
                # 3. Calculate and set the next due date for the new record
                new_expense.next_due_date = new_expense.calculate_next_date()
                new_expense.save()
                
                # 4. Mark the OLD record as NO LONGER RECURRING (it's now a historical record)
                exp.is_recurring = False
                exp.save()
                
                created_count += 1
                logger.info(f"Generated recurring expense: {new_expense} from {exp}")
            except Exception as e:
                logger.error(f"Error processing recurring expense {exp.id}: {str(e)}")
                continue
                
    return f"Processed {created_count} recurring expenses."
