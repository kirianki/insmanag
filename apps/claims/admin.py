# apps/claims/admin.py
from django.contrib import admin
from .models import Claim, ClaimDocument

class ClaimDocumentInline(admin.TabularInline):
    """Allows adding documents directly from the Claim admin page."""
    model = ClaimDocument
    extra = 1
    raw_id_fields = ('uploaded_by',)

@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ('claim_number', 'policy', 'claimant', 'status', 'date_of_loss', 'settled_amount')
    list_filter = ('status', 'policy__provider')
    search_fields = ('claim_number', 'policy__policy_number', 'claimant__first_name', 'claimant__last_name')
    raw_id_fields = ('policy', 'claimant', 'reported_by')
    inlines = [ClaimDocumentInline]
    date_hierarchy = 'date_of_loss'

@admin.register(ClaimDocument)
class ClaimDocumentAdmin(admin.ModelAdmin):
    list_display = ('claim', 'document_type', 'uploaded_by', 'created_at')
    search_fields = ('claim__claim_number', 'document_type')
    raw_id_fields = ('claim', 'uploaded_by')
