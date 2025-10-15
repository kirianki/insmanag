# apps/reports/models.py
from django.db import models

class Report(models.Model):
    """
    A proxy model for grouping reports in the Django Admin.
    This model will not have a corresponding table in the database.
    """
    class Meta:
        # This ensures no database table is created for this model.
        managed = False
        # The permission has been moved to the view layer for role-based checks.
        # permissions = [
        #     ("view_agency_reports", "Can view agency and branch level reports"),
        # ]