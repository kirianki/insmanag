// app/(dashboard)/claims/[claimId]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { ClaimDetailsClient } from './components/claim-details-client';

export default function ClaimDetailsPage() {
  const params = useParams();
  
  // The folder name is [claimId], so the param is claimId
  const claimId = params.claimId as string;

  return <ClaimDetailsClient key={claimId} claimId={claimId} />;
}