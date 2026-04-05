// app/(dashboard)/policies/page.tsx

import { PoliciesClient } from './components/policies-client';
import { PageHeader } from '@/components/shared/PageHeader';

export default function PoliciesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Policies" />
      <p className="text-muted-foreground">
        View, manage, and create insurance policies for your clients.
      </p>
      <PoliciesClient />
    </div>
  );
}