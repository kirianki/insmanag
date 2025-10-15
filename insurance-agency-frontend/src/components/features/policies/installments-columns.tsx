'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PolicyInstallment } from '../../../types';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';

// This function allows us to pass the state setter from the parent component
export const getInstallmentColumns = (
  onRecordPayment: (installment: PolicyInstallment) => void
): ColumnDef<PolicyInstallment>[] => [
  {
    accessorKey: 'due_date',
    header: 'Due Date',
    cell: ({ row }) => new Date(row.original.due_date).toLocaleDateString(),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.original.amount);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge className={cn({
          'bg-green-600 text-white': status === 'PAID',
          'bg-gray-500 text-white': status === 'PENDING',
          'bg-red-600 text-white': status === 'OVERDUE',
        })}>
          {row.original.status_display}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'paid_on',
    header: 'Paid On',
    cell: ({ row }) => (row.original.paid_on ? new Date(row.original.paid_on).toLocaleDateString() : 'N/A'),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const installment = row.original;
      if (installment.status === 'PENDING' || installment.status === 'OVERDUE') {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRecordPayment(installment)}
          >
            Record Payment
          </Button>
        );
      }
      return null;
    },
  },
];