'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { StaffCommissionRule } from '../../../../types';
import { DataTable } from '../../../../components/shared/data-table';
import { commissionRuleColumns } from '../../../../components/features/commission-rules/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';

// API Functions
const fetchAllCommissionRules = async (): Promise<{ results: StaffCommissionRule[] }> => {
  // Fetch all rules without filtering by user
  const { data } = await api.get('/commissions/staff-commission-rules/');
  return data;
};

const deleteCommissionRule = async (ruleId: string) => {
  await api.delete(`/commissions/staff-commission-rules/${ruleId}/`);
};

export default function AllCommissionRulesPage() {
  const queryClient = useQueryClient();

  // Query to fetch all rules
  const { data: rulesData, isLoading, error } = useQuery({
    queryKey: ['commissionRules', 'all'], // Use a unique key for the global list
    queryFn: fetchAllCommissionRules,
  });

  // Mutation to delete a rule
  const deleteMutation = useMutation({
    mutationFn: deleteCommissionRule,
    onSuccess: () => {
      // When a rule is deleted, refetch the list
      queryClient.invalidateQueries({ queryKey: ['commissionRules', 'all'] });
    },
    onError: (error) => alert(`Failed to delete rule: ${error.message}`),
  });

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this rule? This action cannot be undone.")) {
      deleteMutation.mutate(ruleId);
    }
  };

  // Memoize columns to pass the delete handler, preventing re-renders
  const columns = React.useMemo(
    () => commissionRuleColumns.map(col => ({ ...col, meta: { deleteRule: handleDeleteRule } })),
    []
  );

  if (isLoading) return <div>Loading commission rules...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Commission Rules</CardTitle>
        <CardDescription>
          This is a global view of every staff commission rule in your agency. To create a new rule, first select a user from the Users & Roles page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rulesData?.results || []}
          filterColumnId="user_name" // Filter by the new user_name column
          filterPlaceholder="Filter by user name..."
        />
      </CardContent>
    </Card>
  );
}