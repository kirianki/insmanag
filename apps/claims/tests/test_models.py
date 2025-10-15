# apps/claims/tests/test_models.py
import pytest
from django.db.models import ProtectedError
from ..models import Claim
from .factories import ClaimFactory

pytestmark = pytest.mark.django_db

class TestClaimModel:
    def test_claim_number_is_generated_on_save(self):
        claim = ClaimFactory(claim_number="") # Create with empty number
        assert claim.claim_number is not None
        assert claim.claim_number.startswith('CLM-')
        
        old_number = claim.claim_number
        claim.loss_description = "Updated description"
        claim.save()
        assert claim.claim_number == old_number

    def test_deleting_policy_with_claim_is_protected(self):
        claim = ClaimFactory()
        policy = claim.policy
        
        with pytest.raises(ProtectedError):
            policy.delete()
            
        assert Claim.objects.filter(pk=claim.pk).exists()

    def test_deleting_claimant_with_claim_is_protected(self):
        claim = ClaimFactory()
        claimant = claim.claimant
        
        with pytest.raises(ProtectedError):
            claimant.delete()

        assert Claim.objects.filter(pk=claim.pk).exists()