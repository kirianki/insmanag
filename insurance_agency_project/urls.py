from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # App URLs
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.customers.urls')),
    path('api/v1/', include('apps.policies.urls')),
    path('api/v1/commissions/', include('apps.commissions.urls')),
    path('api/v1/', include('apps.communications.urls')),
    path('api/v1/', include('apps.auditing.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/claims/', include('apps.claims.urls')),
    path('api/v1/reports/', include('apps.reportings.urls')),
    path('api/v1/finances/', include('apps.finances.urls')),
    path('api/v1/accounting/', include('apps.finances.urls')), # Alias for backward compatibility/external tools


    # DRF Spectacular URLs
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
