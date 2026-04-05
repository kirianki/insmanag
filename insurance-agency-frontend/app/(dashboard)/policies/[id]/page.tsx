// app/(dashboard)/policies/[id]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { PolicyDetailsClient } from './components/policy-details-client';

export default function PolicyDetailsPage() {
  const params = useParams();
  
  // In this pattern, params.id can be a string or string[]
  // We cast it to ensure it's a single string.
  const policyId = params.id as string;

  // We no longer fetch data here. We just pass the ID.
  // The PolicyDetailsClient will handle everything else.
  // We also add a key to ensure the component re-mounts if the ID changes.
  return <PolicyDetailsClient key={policyId} policyId={policyId} />;
}