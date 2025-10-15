from django.contrib import admin
from .models import SystemLog

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ('action_type', 'user', 'branch', 'ip_address', 'created_at')
    list_filter = ('action_type', 'branch__agency')
    search_fields = ('user__email', 'details', 'ip_address')
    # Make details read-only as it's a JSON log
    readonly_fields = ('details',)