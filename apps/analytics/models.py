# apps/analytics/models.py
from django.db import models

class AnalyticsDashboard(models.Model):
    """
    A proxy model to which we can attach analytics-related permissions.
    This model will not have a corresponding table in the database.
    """
    class Meta:
        # This ensures no database table is created for this model.
        managed = False
        # This is where we define our custom permission.
        permissions = [
            ("view_dashboard_summary", "Can view the main analytics dashboard"),
        ]