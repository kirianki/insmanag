# apps/claims/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from .views import ClaimViewSet, ClaimDocumentViewSet

# Create the base router and register the main 'claims' endpoint.
router = routers.DefaultRouter()
router.register(r'claims', ClaimViewSet, basename='claim')

# Create a nested router for documents under a claim.
# This creates URLs like: /api/v1/claims/{claim_pk}/documents/
claims_router = routers.NestedSimpleRouter(router, r'claims', lookup='claim')
claims_router.register(r'documents', ClaimDocumentViewSet, basename='claim-documents')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(claims_router.urls)), # Include the nested URLs
]