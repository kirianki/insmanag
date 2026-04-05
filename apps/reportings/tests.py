from django.test import TestCase
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.accounts.tests.factories import UserFactory
from apps.commissions.tests.factories import StaffCommissionFactory
from datetime import datetime
try:
    import zoneinfo
except ImportError:
    from backports import zoneinfo

class ReportingTimeZoneTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=self.admin)
        self.eat = zoneinfo.ZoneInfo('Africa/Nairobi')

    def test_commission_report_respects_time_zone(self):
        """
        Verify that commissions created late at night (UTC) are correctly
        included in the report for the next day (EAT).
        """
        # Create a commission at 2025-12-31 22:00:00 UTC
        # This is 2026-01-01 01:00:00 EAT
        utc_dt = datetime(2025, 12, 31, 22, 0, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
        
        commission = StaffCommissionFactory(agent=self.admin)
        from apps.commissions.models import StaffCommission
        StaffCommission.objects.filter(id=commission.id).update(created_at=utc_dt)
        commission.refresh_from_db()
        self.assertEqual(commission.created_at, utc_dt)

        url = reverse('generate-report', kwargs={'report_type': 'commissions-summary'})

        # 1. Test without date filter (should always be included)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Expected 200, got {response.status_code}. URL: {url}")
        self.assertTrue(len(response.data) > 0)

        # 2. Test with date filter for 2026-01-01
        response = self.client.get(url, {'date_from': '2026-01-01', 'date_to': '2026-01-01'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(len(data), 1, f"Expected 1 record, got {len(data)}. Report data: {data}")

    def test_commission_report_excludes_previous_day_eat(self):
        """
        Verify that commissions created early in the morning (UTC) showing as previous day EAT
        are correctly excluded if filtering for today.
        """
        # Create a commission at 2025-12-31 20:00:00 UTC
        # This is 2025-12-31 23:00:00 EAT
        utc_dt = datetime(2025, 12, 31, 20, 0, 0, tzinfo=zoneinfo.ZoneInfo('UTC'))
        commission = StaffCommissionFactory(agent=self.admin)
        from apps.commissions.models import StaffCommission
        StaffCommission.objects.filter(id=commission.id).update(created_at=utc_dt)

        url = reverse('generate-report', kwargs={'report_type': 'commissions-summary'})

        # Filter for 2026-01-01. This record should be EXCLUDED.
        response = self.client.get(url, {'date_from': '2026-01-01'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
