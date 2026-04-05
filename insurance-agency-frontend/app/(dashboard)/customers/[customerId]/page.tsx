'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '@/services/customerService';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, ShieldCheck, Briefcase, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { DeleteCustomerDialog } from '../components/delete-customer-dialog';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserRoles } from '@/lib/utils';

// Import all tab components
import { CustomerPoliciesTab } from './components/CustomerPoliciesTab';
import { CustomerDocumentsTab } from './components/CustomerDocumentsTab';
import { CustomerClaimsTab } from './components/CustomerClaimsTab';
import { CustomerRenewalsTab } from './components/CustomerRenewalsTab';

// Main page component
export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.customerId as string;
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { user } = useAuth();
  const userRoles = getUserRoles(user);
  const canDelete = userRoles.includes('Agency Admin') || userRoles.includes('Branch Manager');

  const { data: customerResponse, isLoading, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomerById(customerId),
    enabled: !!customerId,
  });

  const customer = customerResponse?.data;

  if (isError) {
    return <div className="p-8 text-center text-destructive">Error: {error.message || 'Failed to load customer details.'}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : (
        <>
          <DeleteCustomerDialog
            isOpen={isDeleteDialogOpen}
            setIsOpen={setDeleteDialogOpen}
            customerId={customer?.id || ''}
            customerName={`${customer?.first_name} ${customer?.last_name}`}
          />
          <PageHeader
            title={`${customer?.first_name} ${customer?.last_name}`}
            subtitle={`Customer #${customer?.customer_number}`}
            action={
              <div className="flex items-center gap-2">
                {canDelete && (
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" /> Delete Customer
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href={`/customers/${customerId}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Customer
                  </Link>
                </Button>
              </div>
            }
          />
        </>
      )}

      {/* This grid layout is already mobile-first and works well. */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <div className="md:col-span-1 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              ) : (
                <>
                  {/* IMPROVEMENT: Icons have flex-shrink-0, and text can break to prevent overflow. */}
                  <div className="flex items-start gap-3"><Mail className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0" /><span className="break-all">{customer?.email || 'N/A'}</span></div>
                  <div className="flex items-start gap-3"><Phone className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0" /><span>{customer?.phone}</span></div>
                  <div className="flex items-start gap-3"><Briefcase className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0" /><span className="break-words">Agent: {customer?.assigned_agent.first_name} {customer?.assigned_agent.last_name}</span></div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span>KYC Status:</span>
                      {/* IMPROVEMENT: Added dynamic badge color for better visual feedback. */}
                      <Badge variant={customer?.kyc_status?.value === 'VERIFIED' ? 'default' : customer?.kyc_status?.value === 'REJECTED' ? 'destructive' : 'secondary'}>
                        {customer?.kyc_status?.label || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <Tabs defaultValue="policies" className="w-full">
            {/* This TabsList is responsive by default, which is effective. */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="policies" className="py-2">Policies</TabsTrigger>
              <TabsTrigger value="documents" className="py-2">Documents</TabsTrigger>
              <TabsTrigger value="claims" className="py-2">Claims</TabsTrigger>
              <TabsTrigger value="renewals" className="py-2">Renewals</TabsTrigger>
            </TabsList>

            {/* --- CORE RESPONSIVE FIX --- */}
            {/* Each tab's content now has a wrapper that allows horizontal scrolling on small screens. */}
            {/* This prevents wide DataTables from breaking the page layout. */}
            <TabsContent value="policies" className="mt-4">
              <div className="w-full overflow-x-auto rounded-md border">
                <CustomerPoliciesTab customerId={customerId} />
              </div>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <div className="w-full overflow-x-auto rounded-md border">
                <CustomerDocumentsTab customerId={customerId} />
              </div>
            </TabsContent>
            <TabsContent value="claims" className="mt-4">
              <div className="w-full overflow-x-auto rounded-md border">
                <CustomerClaimsTab customerId={customerId} />
              </div>
            </TabsContent>
            <TabsContent value="renewals" className="mt-4">
              <div className="w-full overflow-x-auto">
                <CustomerRenewalsTab customerId={customerId} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}