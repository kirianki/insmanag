'use client';

import { ColumnDef } from '@tanstack/react-table';
import { StaffCommission } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { CheckCircle } from 'lucide-react';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
const formatCurrency = (amount: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // Change to your currency
  }).format(parseFloat(amount));
};

// New type to pass handlers via the table's meta property
export type CommissionColumnDef = ColumnDef<StaffCommission> & {
  meta?: {
    approveCommission: (commissionId: string) => void;
    isApproving: boolean;
  }
}

export const commissionColumns: CommissionColumnDef[] = [
  {
    accessorKey: 'policy_number',
    header: 'Policy #',
  },
  {
    // **NEW:** Column for the agent's name, for the manager's view
    accessorKey: 'agent_name',
    header: 'Agent',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={cn("font-semibold", {
            'border-yellow-500 text-yellow-600': status === 'PENDING_APPROVAL',
            'border-blue-500 text-blue-600': status === 'APPROVED',
            'border-purple-500 text-purple-600': status === 'BATCHED',
            'border-green-600 text-green-600': status === 'PAID',
            'border-red-600 text-red-600': status === 'REVERSED',
          })}
        >
          {status.replace(/_/g, ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'commission_amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.commission_amount)}</div>,
  },
  {
    accessorKey: 'created_at',
    header: 'Date Earned',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const commission = row.original;
      const { meta } = column.columnDef;

      // Only show the button if the status is PENDING_APPROVAL
      if (commission.status !== 'PENDING_APPROVAL') {
        return null;
      }

      return (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => meta?.approveCommission(commission.id)}
            disabled={meta?.isApproving}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      );
    },
  },
];