import re
from django.core.management.base import BaseCommand
from django.db import models
from apps.customers.models import Renewal

class Command(BaseCommand):
    help = 'Migrates vehicle registration numbers from the notes field to the dedicated vehicle_registration_number field in the Renewal model.'

    def handle(self, *args, **options):
        # Kenyan plate pattern: K + 2 letters + Optional space + 3 digits + 1 letter
        pattern = r'K[A-Z]{2}\s?\d{3}[A-Z]'
        
        renewals = Renewal.objects.filter(
            models.Q(vehicle_registration_number__isnull=True) | 
            models.Q(vehicle_registration_number='')
        )
        
        updated_count = 0
        self.stdout.write(self.style.SUCCESS(f"Found {renewals.count()} renewals potentially needing migration."))

        for r in renewals:
            if r.notes:
                match = re.search(pattern, r.notes.upper())
                if match:
                    vehicle_reg = match.group(0).replace(' ', '')
                    r.vehicle_registration_number = vehicle_reg
                    r.save()
                    updated_count += 1
                    self.stdout.write(f"Migrated: '{r.notes}' -> '{vehicle_reg}' for Renewal {r.id}")

        self.stdout.write(self.style.SUCCESS(f"Successfully migrated {updated_count} vehicle registration numbers."))
