'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
// FIX: Use the correct, more specific types for the list and paginated responses
import { InsuranceProviderList, PaginatedResponse } from '../../../../types';
import { DataTable } from '../../../../components/shared/data-table';
import { providerColumns, ProviderColumnDef } from '../../../../components/features/providers/columns';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { ProviderForm } from '../../../../components/features/providers/provider-form';
import { ProviderFormValues } from '../../../../components/features/providers/provider-form-schema';

// API Functions
// FIX: Update function signature to return the correct paginated type
const fetchProviders = async (): Promise<PaginatedResponse<InsuranceProviderList>> => {
  const { data } = await api.get('/insurance-providers/');
  return data;
};
const createProvider = (providerData: ProviderFormValues) => api.post('/insurance-providers/', providerData);
const updateProvider = ({ id, ...providerData }: ProviderFormValues & { id: string }) => api.put(`/insurance-providers/${id}/`, providerData);

export default function ProvidersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // FIX: State should use the list type, as that's what the data table provides
  const [editingProvider, setEditingProvider] = useState<InsuranceProviderList | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  const mutation = useMutation({
    mutationFn: (values: ProviderFormValues & { id?: string }) => {
      return values.id ? updateProvider(values as ProviderFormValues & { id: string }) : createProvider(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setIsDialogOpen(false);
      setEditingProvider(null);
    },
    onError: (error) => alert(`Failed to save provider: ${error.message}`),
  });

  const handleOpenDialog = (provider: InsuranceProviderList | null = null) => {
    setEditingProvider(provider);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: ProviderFormValues) => {
    const submission = editingProvider ? { ...values, id: editingProvider.id } : values;
    mutation.mutate(submission);
  };

  // FIX: Use memoization to avoid re-calculating columns on every render
  const columns = useMemo<ProviderColumnDef[]>(
    () => providerColumns.map(col => ({ ...col, meta: { editProvider: handleOpenDialog } })),
    []
  );

  if (isLoading) return <div>Loading providers...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Insurance Providers</CardTitle>
          <CardDescription>Add and manage the insurance companies you work with.</CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>Add Provider</Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          // FIX: The data is in the `results` property of the paginated API response
          data={data?.results || []}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
        />
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) setEditingProvider(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProvider ? 'Edit' : 'Add'} Insurance Provider</DialogTitle>
              {/* FIX: Added description for accessibility, which removes console warnings */}
              <DialogDescription>
                {editingProvider ? `Update the details for '${editingProvider.name}'.` : 'Enter the details for the new provider.'}
              </DialogDescription>
            </DialogHeader>
            <ProviderForm
              onSubmit={handleSubmit}
              isPending={mutation.isPending}
              defaultValues={editingProvider || undefined}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}