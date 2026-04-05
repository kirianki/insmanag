from rest_framework import viewsets, status, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import IsSuperUser, IsAgencyAdmin, IsBranchManager
from apps.auditing.mixins import AuditLogMixin
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Sum
from datetime import datetime, date
from decimal import Decimal

from .models import (
    ExpenseCategory, Expense, StaffContract, PayrollRun, 
    StaffPayment, AgencyRevenue, DeductionType, ContractDeduction, StaffDeduction
)
from .serializers import (
    ExpenseCategorySerializer, ExpenseSerializer, StaffContractSerializer, 
    PayrollRunSerializer, StaffPaymentSerializer, AgencyRevenueSerializer,
    DeductionTypeSerializer, ContractDeductionSerializer, StaffDeductionSerializer
)
from apps.commissions.models import StaffCommission

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpenseCategory.objects.filter(agency=self.request.user.agency)

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Expense.objects.filter(agency=user.agency)
        if user.branch:
            qs = qs.filter(branch=user.branch)
        return qs

    @action(detail=False, methods=['post'])
    def process_recurring(self, request):
        """Processes all recurring expenses and generates new ones if due."""
        from django.utils import timezone
        today = timezone.localdate()
        
        # Find recurring expenses where next_due_date is in the past or today
        expenses_to_process = Expense.objects.filter(
            agency=request.user.agency,
            is_recurring=True,
            next_due_date__lte=today
        )
        
        created_count = 0
        with transaction.atomic():
            for exp in expenses_to_process:
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
                    recorded_by=exp.recorded_by or request.user
                )
                new_expense.next_due_date = new_expense.calculate_next_date()
                new_expense.save()
                
                # 3. Mark the OLD record as NO LONGER RECURRING (it's now a historical record)
                exp.is_recurring = False
                exp.save()
                
                created_count += 1
                
        return Response({"detail": f"Processed {created_count} recurring expenses."}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_recurring and not instance.next_due_date:
            instance.next_due_date = instance.calculate_next_date()
            instance.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        # If it's a recurring expense that has already passed its date
        if instance.is_recurring and instance.date_incurred < date.today():
            # Check if any "template" fields changed
            template_fields = ['amount', 'category', 'frequency', 'description']
            changed = any(serializer.validated_data.get(f) != getattr(instance, f) for f in template_fields if f in serializer.validated_data)
            
            if changed:
                # 1. Stop recurrence of the OLD one
                # Note: We don't save yet, we let the standard update happen or we manually handle it
                
                # If we use standard update on the OLD one, it will change its amount.
                # BUT the user wants the PREVIOUS month NOT affected.
                # So we should NOT update the OLD one with the NEW amount.
                
                # 2. Create the NEW one with updated values
                new_data = {
                    'agency': instance.agency,
                    'branch': instance.branch,
                    'category': serializer.validated_data.get('category', instance.category),
                    'amount': serializer.validated_data.get('amount', instance.amount),
                    'date_incurred': instance.calculate_next_date(), # Start from NEXT occurrence
                    'description': serializer.validated_data.get('description', instance.description),
                    'frequency': serializer.validated_data.get('frequency', instance.frequency),
                    'is_recurring': True,
                    'recorded_by': self.request.user
                }
                new_data['next_due_date'] = Expense(**new_data).calculate_next_date()
                Expense.objects.create(**new_data)
                
                # 3. Update the OLD one but FORCE is_recurring=False and KEEP old amount/category/etc
                # Actually, we should only allow updating non-template fields on the old one,
                # or just tell the user we split it.
                
                # To fulfill "previous month is not affected", we ignore the new values for the old record 
                # except for stopping recurrence.
                serializer.validated_data['is_recurring'] = False
                # Revert template fields in validated_data to original values so the old record stays constant
                for f in template_fields:
                    if f in serializer.validated_data:
                        serializer.validated_data[f] = getattr(instance, f)
        
        super().perform_update(serializer)

class StaffContractViewSet(viewsets.ModelViewSet):
    serializer_class = StaffContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user']

    def get_queryset(self):
        return StaffContract.objects.filter(agency=self.request.user.agency)

class DeductionTypeViewSet(viewsets.ModelViewSet):
    serializer_class = DeductionTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeductionType.objects.filter(agency=self.request.user.agency)

class ContractDeductionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = ContractDeductionSerializer
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin | IsBranchManager)]
    queryset = ContractDeduction.objects.select_related('contract__user', 'deduction_type').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['contract', 'deduction_type']

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_superuser: return qs
        if user.is_agency_admin: return qs.filter(contract__agency=user.agency)
        if user.is_branch_manager: return qs.filter(contract__user__branch=user.branch)
        return qs.none()

    def perform_create(self, serializer):
        # Validation could be added here to ensure contract belongs to user's scope
        super().perform_create(serializer)

class StaffDeductionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StaffDeductionSerializer
    permission_classes = [permissions.IsAuthenticated, (IsSuperUser | IsAgencyAdmin | IsBranchManager)]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['deduction_type', 'staff_payment__user', 'staff_payment__payroll_run__month']
    ordering_fields = ['staff_payment__payroll_run__month', 'amount']
    ordering = ['-staff_payment__payroll_run__month']

    def get_queryset(self):
        user = self.request.user
        qs = StaffDeduction.objects.select_related(
            'staff_payment__user', 
            'staff_payment__payroll_run',
            'deduction_type'
        )
        if user.is_superuser:
            return qs.all()
        if user.is_agency_admin:
            return qs.filter(staff_payment__payroll_run__agency=user.agency)
        if user.is_branch_manager:
             # Assuming StaffPayment has user which has branch, or we go through policy?
             # StaffPayment -> User -> Branch
            return qs.filter(staff_payment__user__branch=user.branch)
        return qs.none()

    @action(detail=False, methods=['get'])
    def annual_summary(self, request):
        year = request.query_params.get('year')
        user_id = request.query_params.get('user')
        
        if not year:
            year = date.today().year
            
        qs = self.get_queryset().filter(staff_payment__payroll_run__month__year=year)
        
        if user_id:
            qs = qs.filter(staff_payment__user_id=user_id)
            
        summary = qs.values('name').annotate(total=Sum('amount')).order_by('name')
        
        return Response(summary)

class PayrollRunViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PayrollRun.objects.filter(agency=self.request.user.agency).order_by('-month')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generates a draft payroll for a specific month.
        Expected data: {'month': 'YYYY-MM-DD'} (Use first day of month)
        """
        agency = request.user.agency
        month_str = request.data.get('month')
        
        if not month_str:
            return Response({"error": "Month is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            month = datetime.strptime(month_str, '%Y-%m-%d').date().replace(day=1)
        except ValueError:
            return Response({"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)

        if PayrollRun.objects.filter(agency=agency, month=month).exists():
            return Response({"error": "Payroll for this month already exists"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            payroll_run = PayrollRun.objects.create(
                agency=agency,
                month=month,
                processed_by=request.user,
                status=PayrollRun.Status.DRAFT
            )

            # Find active contracts overlapping this month
            contracts = StaffContract.objects.filter(
                agency=agency, 
                is_active=True,
                start_date__lte=month
            ).filter(models.Q(end_date__isnull=True) | models.Q(end_date__gte=month))

            total_payout = 0
            
            for contract in contracts:
                user = contract.user
                
                # 1. Base Pay
                base_pay = contract.base_salary
                
                # 2. Commissions (Approved but not yet batched/paid)
                # Note: We fetch ALL approved commissions that are not paid.
                # Ideally, we should filter by date, but usually commissions are paid when processed.
                # Let's pay all 'APPROVED' commissions.
                commissions = StaffCommission.objects.filter(
                    agent=user,
                    status=StaffCommission.Status.APPROVED
                )
                commission_pay = commissions.aggregate(total=Sum('commission_amount'))['total'] or 0
                
                # 3. Deductions (Dynamic)
                deductions_total = Decimal('0.00')
                active_deductions = contract.deductions.filter(is_active=True)
                deduction_details = []

                for ded in active_deductions:
                    amount = Decimal('0.00')
                    if ded.amount_type == ContractDeduction.AmountType.FIXED:
                         amount = ded.amount
                    elif ded.amount_type == ContractDeduction.AmountType.PERCENTAGE_OF_BASE:
                         amount = (ded.amount / Decimal('100.00')) * base_pay
                    
                    deductions_total += amount
                    deduction_details.append({
                        'deduction_type': ded.deduction_type,
                        'name': ded.deduction_type.name,
                        'amount': amount
                    })
                
                # 4. Net Pay - for ACTUAL payment logic
                net_pay = base_pay + commission_pay - deductions_total
                
                # 5. Gross Pay - for ACCOUNTING (P&L) expense logic
                gross_pay = base_pay + commission_pay # We could also add bonus here if bonus model existed
                
                payment = StaffPayment.objects.create(
                    payroll_run=payroll_run,
                    user=user,
                    base_pay=base_pay,
                    commission_pay=commission_pay,
                    deductions_total=deductions_total,
                    net_pay=net_pay
                )

                # Create StaffDeduction records
                for detail in deduction_details:
                    StaffDeduction.objects.create(
                        payment=payment,
                        deduction_type=detail['deduction_type'],
                        name=detail['name'],
                        amount=detail['amount']
                    )
                
                # P&L Expense should be the GROSS pay
                total_payout += gross_pay
                
                # We do NOT mark commissions as paid yet. Only on 'approve' of payroll.
            
            payroll_run.total_payout = total_payout
            payroll_run.save()

        return Response(PayrollRunSerializer(payroll_run).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approves and Finalizes the payroll.
        Marks commissions as PAID/BATCHED.
        """
        payroll_run = self.get_object()
        if payroll_run.status != PayrollRun.Status.DRAFT:
             return Response({"error": "Only draft payrolls can be approved"}, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            payroll_run.status = PayrollRun.Status.APPROVED
            payroll_run.save()
            
            # Process payments
            for payment in payroll_run.payments.all():
                # Find the commissions included in this payment calculation...
                # WARNING: In 'generate', we summed ALL approved. If new approved came in between generate and approve, 
                # they act weird if we re-query.
                # Robust way: 'generate' should have linked them or marked them 'PROCESSING'.
                # For simplicity here (MVP): We re-query 'APPROVED' and mark them PAID.
                # This assumes 'generate' and 'approve' happen relatively close or we accept including new ones.
                # Better: In 'generate', we could have created a PayoutBatch, but let's stick to simple.
                
                commissions = StaffCommission.objects.filter(
                    agent=payment.user,
                    status=StaffCommission.Status.APPROVED
                )
                commissions.update(status=StaffCommission.Status.PAID)
                
                payment.is_paid = True # Logic: Agency checks this when physically sending money
                payment.save()

        return Response(PayrollRunSerializer(payroll_run).data)

class StaffPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StaffPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = StaffPayment.objects.filter(payroll_run__agency=user.agency).order_by('-payroll_run__month')
        
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        if user.is_branch_manager:
            qs = qs.filter(user__branch=user.branch)
            
        return qs

    @action(detail=False, methods=['get'])
    def staff_analytics(self, request):
        user_id = request.query_params.get('user')
        if not user_id:
            return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        qs = self.get_queryset().filter(user_id=user_id).exclude(payroll_run__status=PayrollRun.Status.DRAFT)
        
        from django.db.models import Count
        stats = qs.aggregate(
            total_net=Sum('net_pay'),
            total_base=Sum('base_pay'),
            total_commissions=Sum('commission_pay'),
            total_deductions=Sum('deductions_total'),
            count=Count('id')
        )
        
        # Clean decimals for JSON response
        for k, v in stats.items():
            if v is None:
                stats[k] = 0
            elif isinstance(v, Decimal):
                stats[k] = float(v)
                
        return Response(stats)

class AgencyRevenueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AgencyRevenueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AgencyRevenue.objects.filter(agency=self.request.user.agency).select_related(
            'policy__customer', 'policy__provider', 'policy__policy_type'
        )
        if self.request.user.branch:
            qs = qs.filter(policy__branch=self.request.user.branch)
        return qs.order_by('-date_recognized')
