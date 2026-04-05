// app/(dashboard)/customers/[customerId]/edit/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '@/services/customerService';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EditCustomerForm } from './components/edit-customer-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditCustomerPage() {
  const params = useParams();
  const customerId = params.customerId as string;

  const { data: customerResponse, isLoading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId),
    enabled: !!customerId,
  });

  const customer = customerResponse?.data;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-[300px] w-full max-w-2xl" />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Error" />
        <p className="text-destructive">
          Failed to load customer for editing. The customer may not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title={`Edit Customer: ${customer.first_name} ${customer.last_name}`}
        subtitle={`Update the details for customer #${customer.customer_number}`}
        action={
          <Button asChild variant="outline">
            <Link href={`/customers/${customerId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Details
            </Link>
          </Button>
        }
      />
      <div className="max-w-2xl">
        <EditCustomerForm customer={customer} />
      </div>
    </div>
  );
}