'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '../../../../../lib/api';
// NEW: Import useAuth to get the agency context
import { useAuth } from '../../../../../hooks/use-auth';
// FIX: Import the correct PaginatedResponse type
import { InsuranceProvider, ProviderCommissionStructure, PolicyType, PaginatedResponse } from '../../../../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { DataTable } from '../../../../../components/shared/data-table';
import { providerCommissionColumns } from '../../../../../components/features/provider-commissions/colomns';
import { ProviderCommissionForm } from '../../../../../components/features/provider-commissions/form';
import { ProviderCommissionFormValues } from '../../../../../components/features/provider-commissions/form-schema';

// --- API Functions ---
const fetchProviderById = async (id: string): Promise<InsuranceProvider> => {
  const { data } = await api.get(`/insurance-providers/${id}/`);
  return data;
};

const fetchProviderCommissions = async (providerId: string): Promise<PaginatedResponse<ProviderCommissionStructure>> => {
  const { data } = await api.get(`/commissions/provider-commission-structures/?provider=${providerId}`);
  return data;
};

// FIX: This function now requires the agencyId to build the correct URL
const fetchPolicyTypes = async (agencyId: string): Promise<PaginatedResponse<PolicyType>> => {
  const { data } = await api.get(`/agencies/${agencyId}/policy-types/`);
  return data;
};

const createProviderCommission = async (ruleData: ProviderCommissionFormValues & { provider: string }) => {
  const { data } = await api.post('/commissions/provider-commission-structures/', ruleData);
  return data;
};

const deleteProviderCommission = async (ruleId: string) => {
  await api.delete(`/commissions/provider-commission-structures/${ruleId}/`);
};

export default function ProviderCommissionPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const providerId = params.providerId as string;
  // NEW: Get the authenticated user and their loading state to resolve the race condition
  const { user, isLoading: isAuthLoading } = useAuth();
  const agencyId = user?.agency_detail?.id;

  const { data: provider, isLoading: isProviderLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => fetchProviderById(providerId),
    enabled: !!providerId,
  });

  const { data: rulesData, isLoading: areRulesLoading } = useQuery({
    queryKey: ['providerCommissions', providerId],
    queryFn: () => fetchProviderCommissions(providerId),
    enabled: !!providerId,
  });

  // FIX: This query now depends on agencyId and will only run when it's available
  const { data: policyTypesData, isLoading: arePolicyTypesLoading } = useQuery({
    queryKey: ['policyTypes', agencyId],
    queryFn: () => fetchPolicyTypes(agencyId!),
    enabled: !isAuthLoading && !!agencyId, // CRITICAL: Prevents the API call from being made too early
  });

  // FIX: The enrichment logic is now safer and handles edge cases
  const enrichedRules = useMemo(() => {
    if (!rulesData?.results || !policyTypesData?.results) return [];
    const policyTypeMap = new Map(policyTypesData.results.map(pt => [pt.id, pt.name]));
    return rulesData.results.map(rule => ({
      ...rule,
      policy_type_name: policyTypeMap.get(rule.policy_type) || 'Unknown Policy Type',
    }));
  }, [rulesData, policyTypesData]);

  const createMutation = useMutation({
    mutationFn: (values: ProviderCommissionFormValues) => createProviderCommission({ ...values, provider: providerId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providerCommissions', providerId] }),
    onError: (error) => alert(`Failed to create rule: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProviderCommission,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providerCommissions', providerId] }),
    onError: (error) => alert(`Failed to delete rule: ${error.message}`),
  });

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this commission rule?")) {
      deleteMutation.mutate(ruleId);
    }
  };

  const columns = useMemo(() => providerCommissionColumns.map(col => ({ ...col, meta: { deleteRule: handleDeleteRule } })), []);

  // NEW: The overall loading state now correctly includes the auth check
  const isLoading = isAuthLoading || isProviderLoading || areRulesLoading || arePolicyTypesLoading;

  if (isAuthLoading) return <div>Loading user session...</div>;
  if (isLoading) return <div>Loading provider and commission data...</div>;
  if (!provider) return <div>Provider not found.</div>;
  if (!agencyId) return <div>Agency context not found. Cannot load required data.</div>;

  return (
    <div className="space-y-6">
      <Link href="/settings/providers" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to All Providers
      </Link>
      <div>
        <h1 className="text-3xl font-bold">Provider Commission Structures</h1>
        <p className="text-muted-foreground">
          Manage the commission rates paid by <span className="font-semibold text-primary">{provider.name}</span> to the agency.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add New Commission Rule</CardTitle>
          <CardDescription>
            Define the percentage the agency receives for a specific policy and business type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* NEW: Pass the correctly fetched policy types down to the form component */}
          <ProviderCommissionForm
            onSubmit={createMutation.mutate}
            isPending={createMutation.isPending}
            policyTypes={policyTypesData?.results || []}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Existing Commission Structures</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={enrichedRules}
            filterColumnId="policy_type_name"
            filterPlaceholder="Filter by policy type..."
          />
        </CardContent>
      </Card>
    </div>
  );
}