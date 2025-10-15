'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import api from '../../../lib/api';
import { Claim, Customer } from '../../../types';
import { DataTable } from '../../../components/shared/data-table';
import { claimColumns } from '../../../components/features/claims/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

// API Functions
const fetchClaims = async (): Promise<{ results: Claim[] }> => {
  const { data } = await api.get('/claims/claims/');
  return data;
};

// New fetcher for all customers to get their names
const fetchCustomers = async (): Promise<{ results: Customer[] }> => {
  const { data } = await api.get('/customers/');
  return data;
};

export default function ClaimsPage() {
  const router = useRouter();

  // Query 1: Fetch the list of all claims
  const { data: claimsData, isLoading: areClaimsLoading } = useQuery({
    queryKey: ['claims'],
    queryFn: fetchClaims,
  });

  // Query 2: Fetch the list of all customers to map IDs to names
  const { data: customersData, isLoading: areCustomersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  // "Enrich" the claims data by adding the claimant's name to each claim object.
  // React.useMemo ensures this complex operation only runs when the source data changes.
  const enrichedClaims = React.useMemo(() => {
    // Don't proceed until both API calls have returned data
    if (!claimsData || !customersData) return [];

    // Create a fast lookup map: { 'customer-uuid': 'John Doe', ... }
    const customerMap = new Map(customersData.results.map(c => [c.id, `${c.first_name} ${c.last_name}`]));

    // Iterate over each claim and add the 'claimant_name' property
    return claimsData.results.map(claim => ({
      ...claim,
      // The API response for a claim has a 'claimant' field with the customer's UUID
      claimant_name: customerMap.get(claim.claimant) || 'Unknown',
    }));
  }, [claimsData, customersData]);

  const handleRowClick = (claim: Claim) => {
    router.push(`/claims/${claim.id}`);
  };

  // Show a loading state until all necessary data has been fetched
  const isLoading = areClaimsLoading || areCustomersLoading;

  if (isLoading) return <div>Loading claims...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Claims</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Claims</CardTitle>
          <CardDescription>
            A list of all claims you have access to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={claimColumns}
            data={enrichedClaims} // Use the enriched data with names
            onRowClick={handleRowClick}
            filterColumnId="claimant_name"
            filterPlaceholder="Filter by claimant name..."
          />
        </CardContent>
      </Card>
    </div>
  );
}