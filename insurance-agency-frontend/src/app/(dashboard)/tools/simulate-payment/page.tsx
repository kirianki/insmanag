'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { Policy } from '../../../../types';
import { DataTable } from '../../../../components/shared/data-table';
import { awaitingPaymentColumns } from '../../../../components/features/simulate-payment/columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';

// API Functions
const fetchAwaitingPaymentPolicies = async (): Promise<{ results: Policy[] }> => {
  // We fetch all policies and will filter on the client,
  // or ideally, the API would support status filtering like: /policies/?status=AWAITING_PAYMENT
  const { data } = await api.get('/policies/?status=AWAITING_PAYMENT');
  return data;
};

const simulatePayment = (policy_id: string) => {
  return api.post('/commissions/simulate-payment/', { policy_id });
};

export default function SimulatePaymentPage() {
  const queryClient = useQueryClient();
  // **NEW:** State to track which specific simulation is running
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['awaitingPaymentPolicies'],
    queryFn: fetchAwaitingPaymentPolicies,
  });

  const mutation = useMutation({
    mutationFn: simulatePayment,
    onSuccess: (_, policyId) => {
      alert(`Payment simulation for policy ${policyId} was successful!`);
      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['awaitingPaymentPolicies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (error, policyId) => {
      alert(`Simulation for policy ${policyId} failed: ${error.message}`);
    },
    onSettled: () => {
      // Clear the loading state for the specific button
      setSimulatingId(null);
    }
  });

  const handleSimulatePayment = (policyId: string) => {
    setSimulatingId(policyId); // Set loading state for the specific button
    mutation.mutate(policyId);
  };

  // Memoize columns to pass the handlers
  const columns = React.useMemo(
    () => awaitingPaymentColumns.map(col => ({
      ...col,
      meta: {
        simulatePayment: handleSimulatePayment,
        isSimulating: (policyId: string) => simulatingId === policyId,
      },
    })),
    [simulatingId] // Re-memoize if the simulatingId changes
  );

  if (isLoading) return <div>Loading policies awaiting payment...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">M-Pesa C2B Payment Simulator</h1>
      <Card>
        <CardHeader>
          <CardTitle>Policies Awaiting Payment</CardTitle>
          <CardDescription>
            This tool is for testing and administration. Click "Simulate Payment" on a policy to trigger a mock M-Pesa transaction. This will change the policy's status to 'Paid - Pending Activation' and generate commissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data?.results || []}
            filterColumnId="customer_name"
            filterPlaceholder="Filter by customer..."
          />
        </CardContent>
      </Card>
    </div>
  );
}