# apps/customers/services.py
from django.db import transaction
from .models import Customer, CustomerDocument, Lead
from apps.accounts.models import User

class LeadService:
    @staticmethod
    @transaction.atomic
    def convert_lead_to_customer(lead: Lead) -> Customer:
        """
        Converts a qualified lead into a new Customer record.
        - Idempotent: If the lead is already converted, it returns the existing customer.
        - Updates the lead's status and links it to the new customer.
        """
        if lead.converted_customer:
            return lead.converted_customer

        if lead.status == Lead.LeadStatus.LOST:
            raise ValueError("A lost lead cannot be converted.")
            
        customer = Customer.objects.create(
            agency=lead.agency,
            assigned_agent=lead.assigned_agent,
            branch=lead.assigned_agent.branch, # Customer branch is inherited from the agent
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone
        )
        
        lead.status = Lead.LeadStatus.CONVERTED
        lead.converted_customer = customer
        lead.save(update_fields=['status', 'converted_customer', 'updated_at'])
        
        return customer

class KYCService:
    @staticmethod
    @transaction.atomic
    @staticmethod
    @transaction.atomic
    def verify_document(document: CustomerDocument, verified_by: User, notes: str = None):
        """
        Verifies a single document and updates the parent customer's KYC status if all documents are now verified.
        """
        # Always update notes if provided, even if status doesn't change
        if notes:
            document.notes = notes

        if document.verification_status == CustomerDocument.VerificationStatus.VERIFIED:
            if notes: # Save notes if they were updated
                document.save(update_fields=['notes', 'updated_at'])
            return document # Already verified

        document.verification_status = CustomerDocument.VerificationStatus.VERIFIED
        document.verified_by = verified_by
        document.save(update_fields=['verification_status', 'verified_by', 'notes', 'updated_at'])
        KYCService.check_and_update_customer_kyc_status(document.customer, verified_by)
        return document

    @staticmethod
    @transaction.atomic
    def reject_document(document: CustomerDocument, rejected_by: User, rejection_reason: str):
        """Rejects a single document and updates the parent customer's status."""
        document.notes = rejection_reason # Always update rejection reason
        
        if document.verification_status == CustomerDocument.VerificationStatus.REJECTED:
             document.save(update_fields=['notes', 'updated_at'])
             return document 

        document.verification_status = CustomerDocument.VerificationStatus.REJECTED
        document.verified_by = rejected_by
        document.save(update_fields=['verification_status', 'verified_by', 'notes', 'updated_at'])
        
        customer = document.customer
        if customer.kyc_status != Customer.KYCStatus.REJECTED:
            customer.kyc_status = Customer.KYCStatus.REJECTED
            customer.kyc_verified_by = rejected_by
            customer.save(update_fields=['kyc_status', 'kyc_verified_by', 'updated_at'])
        return document

    @staticmethod
    def check_and_update_customer_kyc_status(customer: Customer, verified_by: User):
        """
        Checks if all of a customer's documents are verified. If so, updates the customer's KYC status.
        """
        all_documents = customer.documents.all()
        if not all_documents.exists():
            return

        if all_documents.filter(verification_status=CustomerDocument.VerificationStatus.REJECTED).exists():
            if customer.kyc_status != Customer.KYCStatus.REJECTED:
                customer.kyc_status = Customer.KYCStatus.REJECTED
                customer.kyc_verified_by = verified_by
                customer.save(update_fields=['kyc_status', 'kyc_verified_by', 'updated_at'])
            return

        if all_documents.filter(verification_status=CustomerDocument.VerificationStatus.PENDING).exists():
            return

        customer.kyc_status = Customer.KYCStatus.VERIFIED
        customer.kyc_verified_by = verified_by
        customer.save(update_fields=['kyc_status', 'kyc_verified_by', 'updated_at'])