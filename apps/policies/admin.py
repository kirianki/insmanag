# apps/policies/admin.py
from django.contrib import admin
from .models import InsuranceProvider, PolicyType, Policy, PolicyInstallment

@admin.register(InsuranceProvider)
class InsuranceProviderAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'phone_number', 'email', 'created_at')
    search_fields = ('name', 'email', 'contact_person_name')
    list_filter = ('is_active', 'country')

@admin.register(PolicyType)
class PolicyTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'agency', 'is_active', 'requires_vehicle_reg')
    search_fields = ('name', 'agency__agency_name')
    list_filter = ('agency', 'is_active')
    list_editable = ('is_active', 'requires_vehicle_reg')

# --- NEW: Inline admin for installments on the Policy page ---
class PolicyInstallmentInline(admin.TabularInline):
    model = PolicyInstallment
    extra = 1
    readonly_fields = ('created_at', 'updated_at')
    fields = ('due_date', 'amount', 'status', 'paid_on', 'transaction_reference')

@admin.register(Policy)
class PolicyAdmin(admin.ModelAdmin):
    # --- UPDATED list_display and added inlines ---
    list_display = ('policy_number', 'customer', 'agency', 'branch', 'agent', 'provider', 'status', 'total_premium_amount', 'is_installment')
    search_fields = ('policy_number', 'customer__first_name', 'customer__last_name', 'vehicle_registration_number')
    list_filter = ('status', 'provider', 'policy_type', 'agency', 'branch', 'is_installment')
    raw_id_fields = ('customer', 'agent', 'provider', 'policy_type', 'agency', 'branch')
    date_hierarchy = 'created_at'
    list_select_related = ('customer', 'agent', 'provider', 'policy_type', 'agency', 'branch')
    # --- ADDED inlines ---
    inlines = [PolicyInstallmentInline]