# apps/commissions/admin.py
from django.contrib import admin
from .models import (
    CustomerPayment, ProviderCommissionStructure, StaffCommissionRule,
    PayoutBatch, StaffCommission
)

@admin.register(CustomerPayment)
class CustomerPaymentAdmin(admin.ModelAdmin):
    list_display = ('policy', 'customer', 'amount', 'mpesa_reference', 'payment_date')
    search_fields = ('policy__policy_number', 'customer__first_name', 'mpesa_reference')
    raw_id_fields = ('customer', 'policy')

@admin.register(ProviderCommissionStructure)
class ProviderCommissionStructureAdmin(admin.ModelAdmin):
    list_display = ('agency', 'provider', 'policy_type', 'commission_type', 'rate_percentage')
    list_filter = ('agency', 'provider', 'commission_type')
    raw_id_fields = ('agency', 'provider', 'policy_type')

@admin.register(StaffCommissionRule)
class StaffCommissionRuleAdmin(admin.ModelAdmin):
    # --- FIX: Removed 'provider' from list_display as it no longer exists on the model ---
    list_display = ('user', 'agency', 'policy_type', 'payout_basis', 'rate_percentage')
    list_filter = ('agency', 'payout_basis')
    raw_id_fields = ('agency', 'user', 'policy_type')
    search_fields = ('user__email',)

@admin.register(PayoutBatch)
class PayoutBatchAdmin(admin.ModelAdmin):
    list_display = ('agency', 'status', 'total_amount', 'commission_count', 'initiated_by', 'created_at')
    list_filter = ('status', 'agency')
    raw_id_fields = ('agency', 'initiated_by')

@admin.register(StaffCommission)
class StaffCommissionAdmin(admin.ModelAdmin):
    list_display = ('agent', 'policy', 'agency', 'branch', 'commission_amount', 'status', 'payout_batch')
    list_filter = ('status', 'agency', 'branch', 'commission_type')
    raw_id_fields = ('agent', 'policy', 'payout_batch', 'agency', 'branch')
    search_fields = ('agent__email', 'policy__policy_number')