// app/settings/users/branch/[branchId]/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import api from '../../../../../../lib/api';
import { User, Agency, UserFormValues } from '../../../../../../types';
import { DataTable } from '../../../../../../components/shared/data-table';
import { userColumns } from '../../../../../../components/features/users/columns';
import { Button } from '../../../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../../../../components/ui/dialog';
import { UserForm } from '../../../../../../components/features/users/user-form';
import { Alert, AlertDescription } from '../../../../../../components/ui/alert';
import { Loader2 } from 'lucide-react';

// Updated fetch: Send 'unassigned' directly; backend filters branch__isnull=True
const fetchUsersByBranch = async (branchId: string): Promise<{ results: User[] }> => {
  const params = { branch: branchId };  // Works for both UUID and 'unassigned'
  const { data } = await api.get('/accounts/users/', { params });
  return data;
};

const fetchMyAgency = async (): Promise<Agency> => {
  const { data } = await api.get('/accounts/agencies/');
  return Array.isArray(data.results) ? data.results[0] : data;
};

const createUser = async (userData: UserFormValues): Promise<User> => {
  const { data } = await api.post('/accounts/users/', userData);
  return data;
};

export default function BranchUsersPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const branchId = params.branchId as string;
  const isUnassigned = branchId === 'unassigned';
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: usersData, isLoading: areUsersLoading, error: usersError } = useQuery({ 
    queryKey: ['users', branchId], 
    queryFn: () => fetchUsersByBranch(branchId) 
  });

  const { data: agencyData, isLoading: isAgencyLoading, error: agencyError } = useQuery({ 
    queryKey: ['myAgency'], 
    queryFn: fetchMyAgency 
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users', branchId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      router.push(`/settings/users/detail/${newUser.id}`);  // FIXED: Added /detail/ to match folder structure
    },
    onError: (error) => {
      alert(`Failed to create user: ${error.message}`);
    },
  });

  const handleCreateUser = (values: UserFormValues) => {
    const payload = { ...values, branch: isUnassigned ? undefined : branchId };
    mutation.mutate(payload);
  };

  const currentBranch = useMemo(() => {
    if (isUnassigned || !agencyData) return null;
    return agencyData.branches.find(b => b.id === branchId);
  }, [agencyData, branchId, isUnassigned]);

  const isLoading = areUsersLoading || isAgencyLoading;
  const hasError = !!(usersError || agencyError);
  const errorMessage = usersError?.message || agencyError?.message || 'Failed to load data';
  const pageTitle = isUnassigned ? "Unassigned Users" : `Users in ${currentBranch?.branch_name || 'Branch'}`;

  if (hasError) {
    return (
      <div className="space-y-6">
        <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to User Hub
        </Link>
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center">Loading users...</div>;

  return (
    <div className="space-y-6">
      <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to User Hub
      </Link>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>{isUnassigned ? "These users are not assigned to any branch." : `Manage all staff assigned to this branch.`}</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button>Add User to this Group</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <UserForm 
                onSubmit={handleCreateUser} 
                isPending={mutation.isPending} 
                defaultValues={{ branch: isUnassigned ? undefined : branchId }} 
                mode="create"
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={userColumns}
            data={usersData?.results || []}
            onRowClick={(user) => router.push(`/settings/users/detail/${user.id}`)}  // FIXED: Added /detail/ to match folder structure
            filterColumnId="name"
            filterPlaceholder="Filter by name..."
            emptyStateText="No users found in this branch."
            rowAriaLabel={(user) => `View details for ${user.first_name} ${user.last_name}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}