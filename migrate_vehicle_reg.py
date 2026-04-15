import os
import django
import re

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'insmanag.settings')
django.setup()

from django.db import models
from apps.customers.models import Renewal

# Kenyan plate pattern: K + 2 letters + Optional space + 3 digits + 1 letter
pattern = r'K[A-Z]{2}\s?\d{3}[A-Z]'

def migrate_vehicle_data():
    renewals = Renewal.objects.filter(
        models.Q(vehicle_registration_number__isnull=True) | 
        models.Q(vehicle_registration_number='')
    )
    updated_count = 0

    print(f"Found {renewals.count()} renewals potentially needing migration.")

    for r in renewals:
        if r.notes:
            match = re.search(pattern, r.notes.upper())
            if match:
                vehicle_reg = match.group(0).replace(' ', '')
                print(f"Migrating: '{r.notes}' -> '{vehicle_reg}' for Renewal {r.id}")
                r.vehicle_registration_number = vehicle_reg
                r.save()
                updated_count += 1

    print(f"Successfully migrated {updated_count} vehicle registration numbers.")

if __name__ == "__main__":
    migrate_vehicle_data()
