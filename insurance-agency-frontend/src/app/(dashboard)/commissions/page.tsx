'use client';

import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { StaffCommission } from '../../../types';
import { useAuth } from '../../../hooks/use-auth';
import { DataTable } from '../../../components/shared/data-table';
import { commissionColumns } from '../../../components/features/commissions/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

// API Functions
const fetchCommissions = async (): Promise<{ results: StaffCommission[] }> => {
  const { data } = await api.get('/commissions/staff-commissions/');
  return data;
};

const approveCommission = (commissionId: string) => {
  return api.post(`/commissions/staff-commissions/${commissionId}/approve/`);
};

export default function CommissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['commissions'],
    queryFn: fetchCommissions,
  });

  const approveMutation = useMutation({
    mutationFn: approveCommission,
    onSuccess: () => {
      // When an approval succeeds, refetch all commission data
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (error) => alert(`Failed to approve commission: ${error.message}`),
  });

  const isManager = user?.roles.includes('Branch Manager') || user?.roles.includes('Agency Admin');

  // Create the columns dynamically based on the user's role
  const columns = useMemo(() => {
    let cols = commissionColumns;
    if (!isManager) {
      // If the user is not a manager, hide the 'agent_name' and 'actions' columns
      cols = cols.filter(col => col.accessorKey !== 'agent_name' && col.id !== 'actions');
    } else {
      // If they are a manager, pass the mutation function to the actions column
      cols = cols.map(col => {
        if (col.id === 'actions') {
          return {
            ...col,
            meta: {
              approveCommission: approveMutation.mutate,
              isApproving: approveMutation.isPending,
            },
          };
        }
        return col;
      });
    }
    return cols;
  }, [isManager, approveMutation.mutate, approveMutation.isPending]);

  // Filter data for the manager's tabs
  const pendingCommissions = useMemo(() => {
    return data?.results.filter(c => c.status === 'PENDING_APPROVAL') || [];
  }, [data]);

  if (isLoading) return <div>Loading commissions...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  // RENDER MANAGER / ADMIN VIEW
  if (isManager) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Commission Management</h1>
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="all">All Commissions</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Commissions Awaiting Approval</CardTitle>
                <CardDescription>Review and approve these commissions for your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={pendingCommissions}
                  filterColumnId="agent_name"
                  filterPlaceholder="Filter by agent..."
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Full Commission History</CardTitle>
                <CardDescription>A complete history of all commissions for your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={data?.results || []}
                  filterColumnId="agent_name"
                  filterPlaceholder="Filter by agent..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // RENDER AGENT VIEW
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Commissions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>A list of all your earned commissions and their current payment status.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.results || []}
            filterColumnId="policy_number"
            filterPlaceholder="Filter by policy #..."
          />
        </CardContent>
      </Card>
    </div>
  );
}