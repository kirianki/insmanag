# apps/claims/filters.py
import django_filters
from django.db.models import Q
from .models import Claim

class ClaimFilter(django_filters.FilterSet):
    # Text Search (Partial matches)
    claim_number = django_filters.CharFilter(lookup_expr='icontains', label="Claim Number")
    policy_number = django_filters.CharFilter(field_name='policy__policy_number', lookup_expr='icontains', label="Policy Number")
    
    # Custom method to search claimant name (First, Last, or Company)
    claimant_name = django_filters.CharFilter(method='filter_claimant_name', label="Claimant Name")

    # Status (Allows selecting multiple: ?status=FNOL&status=APPROVED)
    status = django_filters.MultipleChoiceFilter(choices=Claim.Status.choices)

    # Date Ranges (e.g., ?date_of_loss_after=2024-01-01&date_of_loss_before=2024-01-31)
    date_of_loss = django_filters.DateFromToRangeFilter()
    created_at = django_filters.DateFromToRangeFilter(label="Submission Date Range")

    # Financial Ranges
    min_estimated_loss = django_filters.NumberFilter(field_name="estimated_loss_amount", lookup_expr='gte', label="Min Estimated Loss")
    max_estimated_loss = django_filters.NumberFilter(field_name="estimated_loss_amount", lookup_expr='lte', label="Max Estimated Loss")

    class Meta:
        model = Claim
        # Exact ID matches for relational fields
        fields = [
            'agency', 
            'branch', 
            'reported_by'
        ]

    def filter_claimant_name(self, queryset, name, value):
        """
        Filters by claimant's first name, last name, or company name.
        Assumes the Customer model has these fields.
        """
        return queryset.filter(
            Q(claimant__first_name__icontains=value) |
            Q(claimant__last_name__icontains=value) |
            Q(claimant__company_name__icontains=value)
        )