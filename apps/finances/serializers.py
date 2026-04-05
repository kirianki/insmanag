from rest_framework import serializers
from .models import (
    ExpenseCategory, Expense, StaffContract, PayrollRun, 
    StaffPayment, StaffDeduction, AgencyRevenue,
    DeductionType, ContractDeduction
)

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'
        read_only_fields = ('agency',)
        
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['agency'] = user.agency
        return super().create(validated_data)

class DeductionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeductionType
        fields = '__all__'
        read_only_fields = ('agency',)

    def create(self, validated_data):
        validated_data['agency'] = self.context['request'].user.agency
        return super().create(validated_data)

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.email', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('agency', 'recorded_by', 'is_recurring')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['agency'] = user.agency
        validated_data['recorded_by'] = user
        
        # Infer is_recurring from frequency if not already set (e.g. by ViewSet logic)
        if 'frequency' in validated_data and 'is_recurring' not in validated_data:
            validated_data['is_recurring'] = validated_data['frequency'] != Expense.Frequency.ONE_TIME
            
        # Branch could be optional or inferred
        if not validated_data.get('branch') and user.branch:
            validated_data['branch'] = user.branch
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Infer is_recurring from frequency if changed and not already set
        if 'frequency' in validated_data and 'is_recurring' not in validated_data:
            validated_data['is_recurring'] = validated_data['frequency'] != Expense.Frequency.ONE_TIME
        return super().update(instance, validated_data)

class ContractDeductionSerializer(serializers.ModelSerializer):
    deduction_type_name = serializers.CharField(source='deduction_type.name', read_only=True)

    class Meta:
        model = ContractDeduction
        fields = '__all__'

class StaffContractSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    deductions = ContractDeductionSerializer(many=True, read_only=True)
    
    class Meta:
        model = StaffContract
        fields = '__all__'
        read_only_fields = ('agency',)

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['agency'] = user.agency
        return super().create(validated_data)

class StaffDeductionSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='payment.user.get_full_name', read_only=True)
    staff_email = serializers.CharField(source='payment.user.email', read_only=True)
    deduction_type_name = serializers.CharField(source='name', read_only=True)
    month = serializers.DateField(source='payment.payroll_run.month', read_only=True)

    class Meta:
        model = StaffDeduction
        fields = '__all__'

class StaffPaymentSerializer(serializers.ModelSerializer):
    deductions = StaffDeductionSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    payroll_run_month = serializers.DateField(source='payroll_run.month', read_only=True)
    
    class Meta:
        model = StaffPayment
        fields = '__all__'
        
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class PayrollRunSerializer(serializers.ModelSerializer):
    payments = StaffPaymentSerializer(many=True, read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.email', read_only=True)
    
    class Meta:
        model = PayrollRun
        fields = '__all__'
        read_only_fields = ('agency', 'processed_by', 'status', 'total_payout', 'run_date')

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['agency'] = user.agency
        validated_data['processed_by'] = user
        return super().create(validated_data)

class AgencyRevenueSerializer(serializers.ModelSerializer):
    source_policy_number = serializers.CharField(source='policy.policy_number', read_only=True)
    provider_name = serializers.CharField(source='policy.provider.name', read_only=True)
    policy_type_name = serializers.CharField(source='policy.policy_type.name', read_only=True)
    
    class Meta:
        model = AgencyRevenue
        fields = '__all__'
        read_only_fields = ('agency',)
