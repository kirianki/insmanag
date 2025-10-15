'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { PolicyType, PaginatedResponse } from '../../../../types';
import { useAuth } from '../../../../hooks/use-auth';
import { DataTable } from '../../../../components/shared/data-table';
import { policyTypeColumns } from '../../../../components/features/policy-types/columns';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
// FIX: Import DialogDescription
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { PolicyTypeForm } from '../../../../components/features/policy-types/policy-type-form';
import { PolicyTypeFormValues } from '../../../../components/features/policy-types/policy-type-form-schema';

// --- API Functions remain the same ---
const fetchPolicyTypes = async (agencyId: string): Promise<PaginatedResponse<PolicyType>> => {
  const { data } = await api.get(`/agencies/${agencyId}/policy-types/`);
  return data;
};
const createPolicyType = (agencyId: string, formData: PolicyTypeFormValues) => api.post(`/agencies/${agencyId}/policy-types/`, formData);
const updatePolicyType = (agencyId: string, { id, ...formData }: PolicyTypeFormValues & { id: string }) => api.put(`/agencies/${agencyId}/policy-types/${id}/`, formData);


export default function PolicyTypesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPolicyType, setEditingPolicyType] = useState<PolicyType | null>(null);
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const agencyId = user?.agency_detail?.id;

  const { data, isLoading: isPolicyTypesLoading, error } = useQuery({
    queryKey: ['policyTypes', agencyId],
    queryFn: () => fetchPolicyTypes(agencyId!),
    enabled: !isAuthLoading && !!agencyId,
  });

  const mutation = useMutation({
    mutationFn: (values: PolicyTypeFormValues & { id?: string }) => {
      if (!agencyId) throw new Error("Agency not found");
      return values.id ? updatePolicyType(agencyId, values as PolicyTypeFormValues & { id: string }) : createPolicyType(agencyId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyTypes', agencyId] });
      setIsDialogOpen(false);
      setEditingPolicyType(null);
    },
    onError: (error) => alert(`Failed to save policy type: ${error.message}`),
  });

  const handleOpenDialog = (policyType: PolicyType | null = null) => {
    setEditingPolicyType(policyType);
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: PolicyTypeFormValues) => {
    const submission = editingPolicyType ? { ...values, id: editingPolicyType.id } : values;
    mutation.mutate(submission);
  };

  const columns = React.useMemo(() => policyTypeColumns.map(col => ({ ...col, meta: { editPolicyType: handleOpenDialog } })), []);

  if (isAuthLoading) {
    return <div>Loading user session...</div>;
  }
  if (!agencyId) {
    return <div>You must be part of an agency to manage policy types.</div>;
  }
  if (isPolicyTypesLoading) {
    return <div>Loading policy types...</div>;
  }
  if (error) {
    return <div>An error occurred: {error.message}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Policy Types</CardTitle>
          <CardDescription>Add and manage the types of insurance policies your agency offers.</CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()}>Add Policy Type</Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data?.results || []}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
        />
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) setEditingPolicyType(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPolicyType ? 'Edit' : 'Add'} Policy Type</DialogTitle>
              {/*
                --- THIS IS THE FIX ---
                Add a DialogDescription to provide context for screen readers.
              */}
              <DialogDescription>
                {editingPolicyType ? `Update the details for the '${editingPolicyType.name}' policy type.` : 'Create a new policy type for your agency.'}
              </DialogDescription>
            </DialogHeader>
            <PolicyTypeForm
              onSubmit={handleSubmit}
              isPending={mutation.isPending}
              defaultValues={editingPolicyType || undefined}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}