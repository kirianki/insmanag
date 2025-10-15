'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { PolicyList, PaginatedPolicies } from '../../../types'; // FIX: Use correct types
import { useAuth } from '../../../hooks/use-auth';
import { DataTable } from '../../../components/shared/data-table';
import { policyColumns } from '../../../components/features/policies/columns';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../../components/ui/dialog';
import { PolicyForm } from '../../../components/features/policies/policy-form';
import { PolicyFormValues } from '../../../components/features/policies/policy-form-schema';

// API Functions
const fetchPolicies = async (): Promise<PaginatedPolicies> => { // FIX: Correct return type
  const { data } = await api.get('/policies/');
  return data;
};

// FIX: Update policyData type to match the new form schema
const createPolicy = async (policyData: PolicyFormValues) => {
  const { data } = await api.post('/policies/', policyData);
  return data;
};

export default function PoliciesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['policies'],
    queryFn: fetchPolicies,
  });

  const mutation = useMutation({
    // FIX: The backend now determines the agent from the request user or the provided agent field
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setIsDialogOpen(false);
      alert('Policy created successfully!');
    },
    onError: (error: any) => {
        const errorMsg = error.response?.data?.detail || error.message;
        alert(`Failed to create policy: ${errorMsg}`);
    },
  });

  // FIX: Parameter should be of type PolicyList
  const handleRowClick = (policy: PolicyList) => {
    router.push(`/policies/${policy.id}`);
  };

  if (isLoading) return <div>Loading policies...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Policies</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Policy</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Policy</DialogTitle>
              <DialogDescription>
                Select a customer and fill in the policy details.
              </DialogDescription>
            </DialogHeader>
            <PolicyForm onSubmit={mutation.mutate} isPending={mutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Policies</CardTitle>
          <CardDescription>
            A list of all insurance policies you have access to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={policyColumns}
            data={data?.results || []}
            onRowClick={handleRowClick}
            filterColumnId="customer_name"
            filterPlaceholder="Filter by customer name..."
          />
        </CardContent>
      </Card>
    </div>
  );
}