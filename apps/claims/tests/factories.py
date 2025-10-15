# apps/claims/tests/factories.py
import factory
from factory.django import DjangoModelFactory
from datetime import date, timedelta
from ..models import Claim, ClaimDocument
from apps.policies.tests.factories import PolicyFactory

class ClaimFactory(DjangoModelFactory):
    class Meta:
        model = Claim

    policy = factory.SubFactory(PolicyFactory)
    # Ensure the claimant is the customer associated with the policy
    claimant = factory.SelfAttribute('policy.customer')
    reported_by = factory.SelfAttribute('policy.agent')
    
    date_of_loss = factory.LazyAttribute(lambda o: o.policy.policy_start_date + timedelta(days=10))
    loss_description = factory.Faker('paragraph', nb_sentences=3)
    estimated_amount = factory.Faker('pydecimal', left_digits=5, right_digits=2, positive=True)

class ClaimDocumentFactory(DjangoModelFactory):
    class Meta:
        model = ClaimDocument

    claim = factory.SubFactory(ClaimFactory)
    document_type = factory.Iterator(['Police Abstract', 'Repair Quote', 'Damage Photo'])
    file = factory.django.FileField(filename='claim_doc.pdf')
    uploaded_by = factory.SelfAttribute('claim.reported_by')