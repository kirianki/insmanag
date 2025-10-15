'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PolicyList } from '../../../types'; // FIX: Use the correct type for the list view
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const policyColumns: ColumnDef<PolicyList>[] = [ // FIX: Use PolicyList type
  {
    accessorKey: 'policy_number',
    header: 'Policy #',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant={status === 'ACTIVE' ? 'default' : 'secondary'}
          className={cn({
            'bg-green-600 text-white hover:bg-green-700': status === 'ACTIVE',
            // NEW: Added style for Active Installment
            'bg-teal-500 text-white hover:bg-teal-600': status === 'ACTIVE_INSTALLMENT',
            'bg-yellow-500 text-white hover:bg-yellow-600': status === 'AWAITING_PAYMENT',
            'bg-blue-500 text-white hover:bg-blue-600': status === 'PAID_PENDING_ACTIVATION',
            'bg-red-600 text-white hover:bg-red-700': status === 'EXPIRED' || status === 'CANCELLED',
            'bg-orange-500 text-white hover:bg-orange-600': status === 'LAPSED',
          })}
        >
          {status.replace(/_/g, ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'customer_name',
    header: 'Customer',
  },
  {
    accessorKey: 'provider_name',
    header: 'Provider',
  },
  {
    accessorKey: 'total_premium_amount', // FIX: Renamed from premium_amount
    header: () => <div className="text-right">Premium</div>,
    cell: ({ row }) => {
      // FIX: Use the correct accessor key
      const amount = parseFloat(row.getValue('total_premium_amount'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'KES',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'is_installment',
    header: 'Payment Plan',
    cell: ({ row }) => row.original.is_installment ? 'Installment' : 'Full Payment',
  },
  {
    accessorKey: 'policy_end_date',
    header: 'Expires On',
    cell: ({ row }) => formatDate(row.original.policy_end_date),
  },
];