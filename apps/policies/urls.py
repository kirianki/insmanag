# apps/policies/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from .views import (InsuranceProviderViewSet, PolicyTypeViewSet, PolicyViewSet,
                    PolicyInstallmentViewSet, UnpaidItemsViewSet)
from apps.accounts.urls import router as accounts_router

router = routers.DefaultRouter()
router.register(r'insurance-providers', InsuranceProviderViewSet, basename='insurance-provider')
router.register(r'policies', PolicyViewSet, basename='policy')
# --- NEW: Register the unified unpaid items endpoint ---
router.register(r'unpaid-items', UnpaidItemsViewSet, basename='unpaid-item')

agencies_router = routers.NestedSimpleRouter(accounts_router, r'agencies', lookup='agency')
agencies_router.register(r'policy-types', PolicyTypeViewSet, basename='agency-policy-types')

policies_router = routers.NestedSimpleRouter(router, r'policies', lookup='policy')
policies_router.register(r'installments', PolicyInstallmentViewSet, basename='policy-installments')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(agencies_router.urls)),
    path('', include(policies_router.urls)),
]