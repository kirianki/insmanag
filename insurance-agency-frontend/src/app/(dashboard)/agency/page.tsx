'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Agency, AgencyBranch } from '../../../types';
import { DataTable } from '../../../components/shared/data-table';
import { branchColumns } from '../../../components/features/branches/columns';
import { BranchForm, BranchFormValues } from '../../../components/features/branches/branch-form';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

// --- (CHANGED) Corrected API Functions ---
// The API functions now accept the agencyId to build the correct nested URL.

const fetchAgency = async (): Promise<any> => {
  // The list endpoint for an admin returns a paginated response with one agency.
  const response = await api.get('/accounts/agencies/');
  // We extract the single agency from the 'results' array.
  return Array.isArray(response.data.results) ? response.data.results[0] : response.data;
};

const createBranch = ({ agencyId, ...branchData }: BranchFormValues & { agencyId: string }) =>
  api.post(`/accounts/agencies/${agencyId}/branches/`, branchData);

const updateBranch = ({ agencyId, id, ...branchData }: BranchFormValues & { agencyId: string; id: string }) =>
  api.put(`/accounts/agencies/${agencyId}/branches/${id}/`, branchData);

const deleteBranch = ({ agencyId, branchId }: { agencyId: string, branchId: string }) =>
  api.delete(`/accounts/agencies/${agencyId}/branches/${branchId}/`);

export default function AgencyPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<AgencyBranch | null>(null);
  const queryClient = useQueryClient();

  const { data: agency, isLoading, error } = useQuery({
    queryKey: ['myAgency'],
    queryFn: fetchAgency,
  });

  // --- (CHANGED) Updated `mutationFn` to include agencyId in the payload ---
  const mutation = useMutation({
    mutationFn: (values: BranchFormValues & { id?: string }) => {
      if (!agency?.id) {
        throw new Error("Agency ID is not available.");
      }
      const payload = { ...values, agencyId: agency.id };
      
      if (values.id) {
        return updateBranch(payload as BranchFormValues & { id: string; agencyId: string });
      }
      return createBranch(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgency'] });
      setIsDialogOpen(false);
      setEditingBranch(null);
    },
    onError: (err: any) => alert(`Failed to save branch: ${err.message}`),
  });
  
  // --- (CHANGED) Updated `mutationFn` for delete to pass correct parameters ---
  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAgency'] });
    },
    onError: (err: any) => alert(`Failed to delete branch: ${err.message}`),
  });

  const handleOpenDialog = (branch: AgencyBranch | null = null) => {
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };
  
  // --- (CHANGED) Updated handleDeleteBranch to pass both agencyId and branchId ---
  const handleDeleteBranch = (branchId: string) => {
    if (window.confirm("Are you sure you want to delete this branch? This action cannot be undone.")) {
      if (!agency?.id) {
        alert("Could not delete: Agency ID is missing.");
        return;
      }
      deleteMutation.mutate({ agencyId: agency.id, branchId });
    }
  };

  const columns = useMemo(() => branchColumns.map(col => ({
    ...col,
    meta: { ...col.meta, editBranch: handleOpenDialog, deleteBranch: handleDeleteBranch },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [agency]); // Added agency to dependency array

  if (isLoading) return <div>Loading agency details...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;
  if (!agency) return <div>Could not load agency information.</div>;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Agency</h1>
      <Card>
        <CardHeader>
          <CardTitle>{agency.agency_name}</CardTitle>
          <CardDescription>Agency Code: {agency.agency_code}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To edit agency details, please contact system support.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Branches</CardTitle>
            <CardDescription>Manage your agency's physical or logical branches.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>Add Branch</Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={agency.branches || []}
            filterColumnId="branch_name"
            filterPlaceholder="Filter by branch name..."
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setEditingBranch(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit' : 'Add'} Branch</DialogTitle>
          </DialogHeader>
          <BranchForm
            onSubmit={(values) => {
              const submissionValues = editingBranch ? { ...values, id: editingBranch.id } : values;
              mutation.mutate(submissionValues);
            }}
            isPending={mutation.isPending}
            defaultValues={editingBranch || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}