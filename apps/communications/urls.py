# apps/communications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet, 
    ReminderTemplateViewSet, 
    ReminderLogViewSet
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reminders/templates', ReminderTemplateViewSet, basename='reminder-template')
router.register(r'reminders/logs', ReminderLogViewSet, basename='reminder-log')

urlpatterns = [
    path('', include(router.urls)),
]