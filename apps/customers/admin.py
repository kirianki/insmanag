# apps/customers/admin.py
from django.contrib import admin
from .models import Customer, CustomerDocument, Lead, Renewal

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    # --- ADDED 'branch' to list_display ---
    list_display = ('first_name', 'last_name', 'phone', 'agency', 'branch', 'assigned_agent', 'kyc_status')
    search_fields = ('first_name', 'last_name', 'phone', 'id_number', 'customer_number')
    # --- ADDED 'branch' to list_filter ---
    list_filter = ('kyc_status', 'agency', 'branch')
    raw_id_fields = ('assigned_agent', 'kyc_verified_by', 'agency', 'branch')

@admin.register(CustomerDocument)
class CustomerDocumentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'document_type', 'verification_status', 'created_at')
    search_fields = ('customer__first_name', 'customer__last_name', 'document_type')
    list_filter = ('verification_status', 'document_type')
    raw_id_fields = ('customer', 'verified_by')

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'phone', 'agency', 'assigned_agent', 'status')
    search_fields = ('first_name', 'last_name', 'phone', 'email')
    list_filter = ('status', 'source', 'agency')
    raw_id_fields = ('assigned_agent', 'agency', 'converted_customer')
    list_editable = ('status',)

@admin.register(Renewal)
class RenewalAdmin(admin.ModelAdmin):
    list_display = ('customer', 'policy_type_description', 'renewal_date', 'current_insurer', 'created_by')
    search_fields = ('customer__first_name', 'customer__last_name', 'current_insurer')
    list_filter = ('renewal_date',)
    raw_id_fields = ('customer', 'created_by')