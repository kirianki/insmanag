'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Policy } from '../../../types';
import { Button } from '../../../components/ui/button';

// New type to pass the simulation handler via the table's meta property
export type AwaitingPaymentPolicyColumnDef = ColumnDef<Policy> & {
  meta?: {
    simulatePayment: (policyId: string) => void;
    isSimulating: (policyId: string) => boolean;
  }
}

export const awaitingPaymentColumns: AwaitingPaymentPolicyColumnDef[] = [
  {
    accessorKey: 'policy_number',
    header: 'Policy #',
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer',
  },
  {
    accessorKey: 'premium_amount',
    header: () => <div className="text-right">Premium</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('premium_amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // Change to your currency
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const policy = row.original;
      const { meta } = column.columnDef;

      // Check if this specific row's simulation is in progress
      const isPending = meta?.isSimulating(policy.id) ?? false;

      return (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => meta?.simulatePayment(policy.id)}
            disabled={isPending}
          >
            {isPending ? 'Simulating...' : 'Simulate Payment'}
          </Button>
        </div>
      );
    },
  },
];