'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '../../../../../lib/api';
import { User, StaffCommissionRule } from '../../../../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { Button } from '../../../../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DataTable } from '../../../../../components/shared/data-table';
import { commissionRuleColumns } from '../../../../../components/features/commission-rules/columns';
import { CommissionRuleForm } from '../../../../../components/features/commission-rules/commission-rule-form';
import { CommissionRuleFormValues } from '../../../../../components/features/commission-rules/commission-rule-form-schema';

// API Functions
const fetchUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/accounts/users/${id}/`);
  return data;
};

const fetchCommissionRules = async (userId: string): Promise<{ results: StaffCommissionRule[] }> => {
  const { data } = await api.get(`/commissions/staff-commission-rules/?user=${userId}`);
  return data;
};

const createCommissionRule = async (ruleData: CommissionRuleFormValues & { user: string }) => {
  const { data } = await api.post('/commissions/staff-commission-rules/', ruleData);
  return data;
};

const deleteCommissionRule = async (ruleId: string) => {
  await api.delete(`/commissions/staff-commission-rules/${ruleId}/`);
};

export default function CommissionRulePage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const userId = params.userId as string;

  // Queries
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserById(userId),
    enabled: !!userId,
  });

  const { data: rulesData, isLoading: areRulesLoading } = useQuery({
    queryKey: ['commissionRules', userId],
    queryFn: () => fetchCommissionRules(userId),
    enabled: !!userId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: CommissionRuleFormValues) => createCommissionRule({ ...values, user: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionRules', userId] });
    },
    onError: (error) => alert(`Failed to create rule: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommissionRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissionRules', userId] });
    },
    onError: (error) => alert(`Failed to delete rule: ${error.message}`),
  });

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      deleteMutation.mutate(ruleId);
    }
  };

  // Memoize columns to pass the delete handler
  const columns = React.useMemo(
    () => commissionRuleColumns.map(col => ({ ...col, meta: { deleteRule: handleDeleteRule } })),
    []
  );

  if (isUserLoading) return <div>Loading user data...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div className="space-y-6">
      <Link href="/settings/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Link>
      <div>
        <h1 className="text-3xl font-bold">Commission Rules</h1>
        <p className="text-muted-foreground">
          Manage rules for <span className="font-semibold text-primary">{user.first_name} {user.last_name}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Rule</CardTitle>
          <CardDescription>
            Rules are applied from most specific to least specific. A rule for a specific provider and policy type will override a general rule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommissionRuleForm onSubmit={createMutation.mutate} isPending={createMutation.isPending} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {areRulesLoading ? <p>Loading rules...</p> : (
            <DataTable
              columns={columns}
              data={rulesData?.results || []}
              filterColumnId="provider_name"
              filterPlaceholder="Filter by provider..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}