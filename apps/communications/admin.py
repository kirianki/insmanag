# apps/communications/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Notification
from .reminder_models import ReminderTemplate, ReminderLog, ReminderSettings

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('user__email', 'message')
    raw_id_fields = ('user', 'policy')


@admin.register(ReminderTemplate)
class ReminderTemplateAdmin(admin.ModelAdmin):
    list_display = ('reminder_type', 'name', 'is_active', 'updated_at')
    list_filter = ('reminder_type', 'is_active')
    search_fields = ('name', 'sms_template', 'email_subject_template')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('reminder_type', 'name', 'is_active')
        }),
        ('SMS Content', {
            'fields': ('sms_template',),
            'description': 'Supported placeholders: {{customer_name}}, {{policy_number}}, {{next_due_date}}, etc.'
        }),
        ('Email Content', {
            'fields': ('email_subject_template', 'email_body_template'),
            'description': 'Body template uses plain text for fallback and template logic.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    list_display = ('reminder_type', 'recipient_display', 'channel', 'status', 'sent_at')
    list_filter = ('reminder_type', 'recipient_type', 'channel', 'status', 'sent_at')
    search_fields = ('customer__first_name', 'customer__last_name', 'agent__email', 'sms_content', 'email_subject')
    raw_id_fields = ('customer', 'agent', 'policy')
    readonly_fields = ('created_at', 'sent_at', 'delivery_status')
    
    def recipient_display(self, obj):
        if obj.recipient_type == 'CUSTOMER':
            return format_html('<b>Cust:</b> {}', obj.customer)
        return format_html('<b>Agent:</b> {}', obj.agent)
    recipient_display.short_description = 'Recipient'


@admin.register(ReminderSettings)
class ReminderSettingsAdmin(admin.ModelAdmin):
    list_display = ('agency', 'reminder_type', 'enabled', 'days_before', 'time_of_day')
    list_filter = ('agency', 'reminder_type', 'enabled')
    search_fields = ('agency__name',)