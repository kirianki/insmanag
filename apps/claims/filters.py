# apps/claims/filters.py
from django_filters import rest_framework as filters
from django.db.models import Q
from .models import Claim

class ClaimFilter(filters.FilterSet):
    customer_name = filters.CharFilter(method='filter_by_customer_name', label="Customer Name")

    class Meta:
        model = Claim
        # 'claimant' is the foreign key to the Customer model.
        # By including it here, django-filter automatically creates
        # a filter that accepts a customer ID (UUID).
        fields = ['status', 'policy', 'claimant', 'reported_by']

    def filter_by_customer_name(self, queryset, name, value):
        # ... (method remains the same)
        if not value:
            return queryset
        return queryset.filter(
            Q(claimant__first_name__icontains=value) | Q(claimant__last_name__icontains=value)
        )