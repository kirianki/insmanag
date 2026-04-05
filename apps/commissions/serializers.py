# apps/commissions/serializers.py
from rest_framework import serializers
from .models import (
    CustomerPayment, ProviderCommissionStructure, StaffCommissionRule,
    PayoutBatch, StaffCommission
)

class CustomerPaymentSerializer(serializers.ModelSerializer):
    policy_number = serializers.CharField(source='policy.policy_number', read_only=True)
    customer_name = serializers.CharField(source='customer.__str__', read_only=True)
    class Meta:
        model = CustomerPayment
        fields = ['id', 'policy', 'customer', 'amount', 'mpesa_reference', 'payment_date', 'policy_number', 'customer_name']

class ProviderCommissionStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderCommissionStructure
        fields = ['id', 'provider', 'policy_type', 'commission_type', 'rate_percentage']

class StaffCommissionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffCommissionRule
        fields = ['id', 'user', 'policy_type', 'payout_basis', 'rate_percentage', 'monthly_threshold']

class PayoutBatchSerializer(serializers.ModelSerializer):
    initiated_by_email = serializers.CharField(source='initiated_by.email', read_only=True)
    agency_name = serializers.CharField(source='agency.agency_name', read_only=True)
    class Meta:
        model = PayoutBatch
        fields = ['id', 'status', 'created_at', 'initiated_by', 'agency', 'initiated_by_email', 'agency_name', 'total_amount', 'commission_count']
        read_only_fields = ['status', 'agency', 'initiated_by', 'total_amount', 'commission_count']

class StaffCommissionSerializer(serializers.ModelSerializer):
    agent_email = serializers.CharField(source='agent.email', read_only=True)
    policy_number = serializers.CharField(source='policy.policy_number', read_only=True)
    class Meta:
        model = StaffCommission
        fields = [
            'id', 'agent', 'policy', 'installment', 'commission_type', 'commission_amount', 
            'status', 'payout_batch', 'created_at', 'agent_email', 'policy_number', 'applied_rule_details'
        ]
        read_only_fields = [
            'id', 'agent', 'policy', 'installment', 'commission_type', 
            'commission_amount', 'payout_batch', 'created_at', 'applied_rule_details'
        ]

# --- NOTE: The payment simulation serializers are no longer needed in this app ---