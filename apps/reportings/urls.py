# apps/reports/urls.py
from django.urls import path
from .views import ReportGeneratorView

urlpatterns = [
    # This single path handles all report types, e.g., /reports/sales-summary/ or /reports/policies-detail/
    path('<str:report_type>/', ReportGeneratorView.as_view(), name='generate-report'),
]