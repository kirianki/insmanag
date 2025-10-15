# apps/accounts/urls.py
from __future__ import annotations

from django.urls import include, path
from rest_framework_nested import routers
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AgencyBranchViewSet,
    AgencyOnboardingView,
    AgencyViewSet,
    ChangePasswordView,
    CurrentUserView,
    MyTokenObtainPairView,
    PermissionViewSet,
    RoleViewSet,
    UserViewSet,
)

router = routers.DefaultRouter()
router.register(r"agencies", AgencyViewSet, basename="agency")
router.register(r"users", UserViewSet, basename="user")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"permissions", PermissionViewSet, basename="permission")

agencies_router = routers.NestedSimpleRouter(router, r"agencies", lookup="agency")
agencies_router.register(r"branches", AgencyBranchViewSet, basename="agency-branches")

urlpatterns = [
    # Authentication
    path("auth/token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),

    # User endpoints
    path("users/me/", CurrentUserView.as_view(), name="current-user"),

    # Agency onboarding
    path("onboarding/agency/", AgencyOnboardingView.as_view(), name="onboard-agency"),

    # Routers (nested first)
    path("", include(agencies_router.urls)),
    path("", include(router.urls)),
]