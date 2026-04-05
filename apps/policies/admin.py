# apps/policies/admin.py

from django.contrib import admin
from .models import InsuranceProvider, PolicyType, Policy, PolicyInstallment

@admin.register(InsuranceProvider)
class InsuranceProviderAdmin(admin.ModelAdmin):
    list_display = ['name', 'short_name', 'phone_number', 'email', 'is_active']
    search_fields = ['name', 'short_name']
    list_filter = ['is_active', 'country']

@admin.register(PolicyType)
class PolicyTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'agency', 'payment_structure', 'requires_vehicle_reg', 'is_active']
    search_fields = ['name']
    list_filter = ['agency', 'payment_structure', 'is_active']

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    # This list_display is where the error was
    list_display = [
        'policy_number', 
        'customer', 
        'provider', 
        'policy_type', 
        'status', 
        # FIXED: Changed 'total_premium_amount' to 'premium_amount'
        'premium_amount', 
        'sum_insured', # Good idea to add the new field here
        'policy_start_date', 
        'policy_end_date',
        'agent'
    ]
    search_fields = ['policy_number', 'customer__first_name', 'customer__last_name']
    list_filter = ['status', 'provider', 'policy_type', 'agency', 'branch', 'is_installment']
    # It's also helpful to make new fields read-only in the detail view
    readonly_fields = ['amount_paid', 'balance_due']

@admin.register(PolicyInstallment)
class PolicyInstallmentAdmin(admin.ModelAdmin):
    list_display = ['policy', 'due_date', 'amount', 'status', 'paid_on']
    search_fields = ['policy__policy_number']
    list_filter = ['status', 'due_date']