'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../lib/api';
import { PayoutBatch } from '../../../../types';
import { DataTable } from '../../../../components/shared/data-table';
import { payoutBatchColumns } from '../../../../components/features/payouts/columns';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';

// API Functions
const fetchPayoutBatches = async (): Promise<{ results: PayoutBatch[] }> => {
  const { data } = await api.get('/commissions/payout-batches/');
  return data;
};

const createPayoutBatch = async () => {
  const { data } = await api.post('/commissions/payout-batches/');
  return data;
};

export default function PayoutsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['payoutBatches'],
    queryFn: fetchPayoutBatches,
  });

  const mutation = useMutation({
    mutationFn: createPayoutBatch,
    onSuccess: () => {
      alert('New payout batch creation initiated! It will be processed in the background.');
      queryClient.invalidateQueries({ queryKey: ['payoutBatches'] });
      // Also invalidate commissions, as their status will change to 'BATCHED'
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (err) => alert(`Failed to create batch: ${err.message}`),
  });

  const handleCreateBatch = () => {
    if (window.confirm("Are you sure you want to create a new payout batch? This will include all 'Approved' commissions.")) {
      mutation.mutate();
    }
  };

  if (isLoading) return <div>Loading payout history...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Commission Payouts</CardTitle>
          <CardDescription>Create and view the history of commission payout batches.</CardDescription>
        </div>
        <Button onClick={handleCreateBatch} disabled={mutation.isPending}>
          {mutation.isPending ? 'Processing...' : 'Create New Payout Batch'}
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={payoutBatchColumns}
          data={data?.results || []}
          filterColumnId="initiated_by_email"
          filterPlaceholder="Filter by user..."
        />
      </CardContent>
    </Card>
  );
}