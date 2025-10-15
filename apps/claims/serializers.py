# apps/claims/serializers.py
from rest_framework import serializers
from .models import Claim, ClaimDocument
from apps.policies.models import Policy
from apps.customers.models import Customer
from datetime import date

class SettleClaimSerializer(serializers.Serializer):
    settled_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)

    def validate_settled_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Settled amount must be a positive number.")
        return value

class ClaimDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)
    
    class Meta:
        model = ClaimDocument
        # 'claim' is not needed here as it's provided by the nested URL
        fields = ['id', 'document_type', 'file', 'uploaded_by_email', 'created_at']
        read_only_fields = ['id', 'uploaded_by_email', 'created_at']

class ClaimSerializer(serializers.ModelSerializer):
    documents = ClaimDocumentSerializer(many=True, read_only=True)
    policy_number = serializers.CharField(source='policy.policy_number', read_only=True)
    claimant_name = serializers.CharField(source='claimant.__str__', read_only=True)
    reported_by_email = serializers.CharField(source='reported_by.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Write-only fields that get their choices from the view's context
    policy = serializers.PrimaryKeyRelatedField(queryset=Policy.objects.none())
    claimant = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.none())

    class Meta:
        model = Claim
        fields = [
            'id', 'claim_number', 'status', 'status_display', 'date_of_loss', 
            'loss_description', 'estimated_loss_amount', 'settled_amount',
            'policy', 'claimant', # Write-only fields
            'policy_number', 'claimant_name', 'reported_by_email', # Read-only fields
            'documents', 'created_at'
        ]
        read_only_fields = [
            'id', 'claim_number', 'status', 'status_display', 'settled_amount',
            'policy_number', 'claimant_name', 'reported_by_email', 'documents', 'created_at'
        ]

    def __init__(self, *args, **kwargs):
        """Dynamically set querysets for related fields from the view's context."""
        super().__init__(*args, **kwargs)
        context = self.context
        if 'policies_qs' in context: self.fields['policy'].queryset = context['policies_qs']
        if 'claimants_qs' in context: self.fields['claimant'].queryset = context['claimants_qs']

    def validate(self, data):
        """Perform cross-field validation."""
        policy = data.get('policy')
        claimant = data.get('claimant')
        date_of_loss = data.get('date_of_loss')
        
        # If any of the required fields for validation are missing, skip validation.
        if not all([policy, claimant, date_of_loss]):
            return data

        if policy.customer != claimant:
            raise serializers.ValidationError({"claimant": "The claimant must be the same as the customer on the selected policy."})

        if not (policy.policy_start_date <= date_of_loss <= policy.policy_end_date):
            raise serializers.ValidationError({"date_of_loss": "The date of loss must be within the policy's coverage period."})

        if date_of_loss > date.today():
            raise serializers.ValidationError({"date_of_loss": "The date of loss cannot be in the future."})
            
        return data