# apps/customers/serializers.py
from rest_framework import serializers
from .models import Customer, CustomerDocument, Lead, Renewal
from apps.accounts.models import User

class UserNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']

# --- THIS IS THE CORRECTED SERIALIZER ---
class CustomerDocumentSerializer(serializers.ModelSerializer):
    verified_by = UserNestedSerializer(read_only=True)
    # The 'customer' field is no longer included here because it's handled
    # by the view using the nested URL. The client does not need to send it.

    class Meta:
        model = CustomerDocument
        fields = [
            'id', 'document_type', 'file', # <-- 'customer' removed from this list
            'verification_status', 'verified_by', 'created_at'
        ]
        read_only_fields = ['id', 'verification_status', 'verified_by', 'created_at']

# --- NO OTHER SERIALIZERS NEED TO BE CHANGED ---

class CustomerSerializer(serializers.ModelSerializer):
    documents = CustomerDocumentSerializer(many=True, read_only=True)
    assigned_agent = UserNestedSerializer(read_only=True)
    kyc_verified_by = UserNestedSerializer(read_only=True)
    agency_name = serializers.CharField(source='agency.agency_name', read_only=True)
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_number', 'first_name', 'last_name', 'email',
            'phone', 'id_number', 'assigned_agent', 'kyc_status',
            'kyc_verified_by', 'agency', 'agency_name', 'branch', 'branch_name',
            'documents', 'created_at'
        ]
        read_only_fields = [
            'id', 'agency', 'agency_name', 'branch', 'branch_name', 'kyc_status',
            'customer_number', 'created_at', 'assigned_agent', 'kyc_verified_by'
        ]

class LeadSerializer(serializers.ModelSerializer):
    assigned_agent = UserNestedSerializer(read_only=True)
    agency_name = serializers.CharField(source='agency.agency_name', read_only=True)
    
    class Meta:
        model = Lead
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'status',
            'source', 'notes', 'assigned_agent', 'agency', 'agency_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'agency', 'agency_name', 'assigned_agent',
            'created_at', 'updated_at'
        ]

class RenewalSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.__str__', read_only=True)
    created_by = UserNestedSerializer(read_only=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        customers_queryset = self.context.get('customers_queryset')
        if customers_queryset is not None:
            self.fields['customer'].queryset = customers_queryset

    class Meta:
        model = Renewal
        fields = [
            'id', 'customer', 'customer_name', 'created_by', 'current_insurer',
            'policy_type_description', 'renewal_date', 'premium_estimate', 'notes'
        ]
        read_only_fields = ['id', 'customer_name', 'created_by']