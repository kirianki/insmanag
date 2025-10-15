# apps/policies/serializers.py
from rest_framework import serializers
from .models import InsuranceProvider, PolicyType, Policy, PolicyInstallment
from apps.accounts.models import User
from apps.customers.models import Customer
from apps.accounts.serializers import UserSerializer as UserNestedSerializer  # For consistency
from django.db import transaction
from decimal import Decimal  # ✅ Added for accurate numeric comparison

# --- Insurance Provider Serializers ---
class InsuranceProviderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceProvider
        fields = ['id', 'name', 'short_name', 'is_active', 'phone_number', 'email']


class InsuranceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceProvider
        exclude = ['created_at', 'updated_at']


class PolicyTypeSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source='agency.agency_name', read_only=True)

    class Meta:
        model = PolicyType
        fields = ['id', 'name', 'requires_vehicle_reg', 'is_active', 'agency', 'agency_name']
        read_only_fields = ['agency', 'agency_name']


# --- Activation Serializer ---
class PolicyActivationSerializer(serializers.Serializer):
    """Handles activation for both full and installment policies."""
    insurance_certificate_number = serializers.CharField(required=True, allow_blank=False)
    policy_start_date = serializers.DateField(required=False)
    policy_end_date = serializers.DateField(required=False)

    def validate(self, data):
        start = data.get('policy_start_date')
        end = data.get('policy_end_date')
        if start and end and start >= end:
            raise serializers.ValidationError({
                "policy_end_date": "Policy end date must be after the start date."
            })
        return data


# --- Policy List & Installment Serializers ---
class PolicyListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.__str__', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    agent_name = serializers.CharField(source='agent.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Policy
        fields = [
            'id', 'policy_number', 'status', 'status_display',
            'customer_name', 'provider_name', 'agent_name',
            'total_premium_amount', 'is_installment','vehicle_registration_number',
            'policy_start_date', 'policy_end_date', 'created_at'
        ]


class InstallmentPlanSerializer(serializers.Serializer):
    due_date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class PolicyInstallmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PolicyInstallment
        fields = [
            'id', 'due_date', 'amount', 'status',
            'status_display', 'paid_on', 'transaction_reference'
        ]


# --- Policy Serializer (Main) ---
class PolicySerializer(serializers.ModelSerializer):
    agent_detail = UserNestedSerializer(source='agent', read_only=True)
    customer_detail = serializers.SerializerMethodField(read_only=True)
    provider_detail = InsuranceProviderListSerializer(source='provider', read_only=True)
    policy_type_detail = PolicyTypeSerializer(source='policy_type', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    installments = PolicyInstallmentSerializer(many=True, read_only=True)
    installment_plan = InstallmentPlanSerializer(many=True, write_only=True, required=False)

    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.none(), write_only=True)
    agent = serializers.PrimaryKeyRelatedField(queryset=User.objects.none(), write_only=True)
    provider = serializers.PrimaryKeyRelatedField(queryset=InsuranceProvider.objects.all(), write_only=True)
    policy_type = serializers.PrimaryKeyRelatedField(queryset=PolicyType.objects.none(), write_only=True)

    class Meta:
        model = Policy
        fields = [
            'id', 'policy_number', 'status', 'status_display',
            'total_premium_amount', 'is_installment',
            'policy_start_date', 'policy_end_date',
            'vehicle_registration_number', 'insurance_certificate_number',
            'customer_detail', 'agent_detail', 'provider_detail', 'policy_type_detail',
            'customer', 'agent', 'provider', 'policy_type',
            'installments', 'installment_plan',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'policy_number', 'status', 'status_display',
            'insurance_certificate_number', 'customer_detail',
            'agent_detail', 'provider_detail', 'policy_type_detail',
            'installments', 'created_at', 'updated_at'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        context = self.context
        if 'customers_qs' in context:
            self.fields['customer'].queryset = context['customers_qs']
        if 'agents_qs' in context:
            self.fields['agent'].queryset = context['agents_qs']
        if 'policy_types_qs' in context:
            self.fields['policy_type'].queryset = context['policy_types_qs']

    def get_customer_detail(self, obj):
        return {
            "id": obj.customer.id,
            "name": str(obj.customer),
            "phone": obj.customer.phone
        }

    def validate(self, data):
        request = self.context.get('request')
        is_creating = self.instance is None
        user = request.user if request else None

        # Agent check
        if is_creating and user and not user.is_agent and not data.get('agent'):
            raise serializers.ValidationError({
                "agent": "This field is required for Admins and Managers."
            })

        # Vehicle registration requirement
        policy_type = data.get('policy_type')
        if policy_type and policy_type.requires_vehicle_reg and not data.get('vehicle_registration_number'):
            raise serializers.ValidationError({
                "vehicle_registration_number": f"This field is required for '{policy_type.name}' policies."
            })

        # Date validation
        start = data.get('policy_start_date') or getattr(self.instance, 'policy_start_date', None)
        end = data.get('policy_end_date') or getattr(self.instance, 'policy_end_date', None)
        if start and end and start >= end:
            raise serializers.ValidationError({
                "policy_end_date": "Policy end date must be after the start date."
            })

        # Installment validation
        is_installment = data.get('is_installment', False)
        installment_plan = data.get('installment_plan', [])

        if is_installment:
            if not installment_plan:
                raise serializers.ValidationError({
                    "installment_plan": "An installment plan is required."
                })

            # ✅ Safely convert all to Decimal to handle int/float/string
            total_plan_amount = sum(Decimal(str(item['amount'])) for item in installment_plan)
            premium_amount = Decimal(str(data.get('total_premium_amount')))

            if total_plan_amount != premium_amount:
                raise serializers.ValidationError({
                    "installment_plan": "The sum of installment amounts must equal the total premium amount."
                })
        elif installment_plan:
            raise serializers.ValidationError({
                "installment_plan": "Installment plan should only be provided if 'is_installment' is true."
            })

        return data

    def validate_total_premium_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Premium amount must be a positive number.")
        return value

    def create(self, validated_data):
        installment_plan = validated_data.pop('installment_plan', [])
        with transaction.atomic():
            policy = Policy.objects.create(**validated_data)
            if validated_data.get('is_installment'):
                installments = [
                    PolicyInstallment(policy=policy, **item)
                    for item in installment_plan
                ]
                PolicyInstallment.objects.bulk_create(installments)
        return policy


# --- Payment & Utility Serializers ---
class InstallmentPaymentSerializer(serializers.Serializer):
    paid_on = serializers.DateField()
    transaction_reference = serializers.CharField(required=False, allow_blank=True)


class UnpaidItemSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    item_type = serializers.ChoiceField(choices=['POLICY', 'INSTALLMENT'])
    due_date = serializers.DateField()
    amount_due = serializers.DecimalField(max_digits=12, decimal_places=2)
    policy_number = serializers.CharField()
    customer_name = serializers.CharField()


class SimulatePaymentSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    item_type = serializers.ChoiceField(choices=['POLICY', 'INSTALLMENT'])
