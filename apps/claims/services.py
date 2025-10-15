# apps/claims/services.py
import datetime
import uuid

class ClaimNumberService:
    @staticmethod
    def generate_claim_number():
        """
        Generates a unique claim number.
        Example format: CLM-2025-A4B1C3
        """
        today = datetime.date.today()
        year = today.strftime('%Y')
        unique_part = uuid.uuid4().hex[:6].upper()
        return f"CLM-{year}-{unique_part}"