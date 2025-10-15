# apps/analytics/urls.py
from django.urls import path
from .views import AnalyticsDashboardView

urlpatterns = [
    # A single endpoint that adapts to the user's role
    path('dashboard/', AnalyticsDashboardView.as_view(), name='analytics-dashboard'),
]