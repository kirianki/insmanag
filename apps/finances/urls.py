from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseCategoryViewSet, ExpenseViewSet, StaffContractViewSet, 
    PayrollRunViewSet, AgencyRevenueViewSet, DeductionTypeViewSet, 
    ContractDeductionViewSet, StaffDeductionViewSet, StaffPaymentViewSet
)

router = DefaultRouter()
router.register(r'expense-categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'staff-contracts', StaffContractViewSet, basename='staff-contract')
router.register(r'payroll-runs', PayrollRunViewSet, basename='payroll-run')
router.register(r'staff-payments', StaffPaymentViewSet, basename='staff-payment')
router.register(r'agency-revenue', AgencyRevenueViewSet, basename='agency-revenue')
router.register(r'deduction-types', DeductionTypeViewSet, basename='deduction-type')
router.register(r'contract-deductions', ContractDeductionViewSet, basename='contract-deduction')
router.register(r'staff-deductions', StaffDeductionViewSet, basename='staff-deductions')

# Aliases to match expected "Accounting" structure
router.register(r'salary-structures', StaffContractViewSet, basename='salary-structure')
router.register(r'payroll', PayrollRunViewSet, basename='payroll')
# Mapping transactions to Revenue for now, though it might be broader.
router.register(r'transactions', AgencyRevenueViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]
