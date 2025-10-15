# apps/customers/urls.py
from django.urls import path, include
# --- CHANGE HERE: Import NestedSimpleRouter ---
from rest_framework_nested import routers
from .views import CustomerViewSet, CustomerDocumentViewSet, LeadViewSet, RenewalViewSet

router = routers.DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'renewals', RenewalViewSet, basename='renewal')

# --- CHANGE HERE: Use NestedSimpleRouter ---
# This creates URLs like: /api/v1/customers/{customer_pk}/documents/
customers_router = routers.NestedSimpleRouter(router, r'customers', lookup='customer')
customers_router.register(r'documents', CustomerDocumentViewSet, basename='customer-documents')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(customers_router.urls)),
]