'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Claim } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

// Extend the Claim type to include the enriched claimant_name field
type EnrichedClaim = Claim & {
  claimant_name: string;
};

export const claimColumns: ColumnDef<EnrichedClaim>[] = [
  {
    accessorKey: 'claim_number',
    header: 'Claim #',
  },
  {
    accessorKey: 'claimant_name',
    header: 'Claimant',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('claimant_name')}</div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={cn({
            'border-blue-500 text-blue-500': status === 'FNOL' || status === 'UNDER_REVIEW',
            'border-green-600 text-green-600': status === 'APPROVED' || status === 'SETTLED',
            'border-red-600 text-red-600': status === 'REJECTED',
          })}
        >
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'policy_number',
    header: 'Policy #',
  },
  {
    accessorKey: 'date_of_loss',
    header: 'Date of Loss',
    cell: ({ row }) => formatDate(row.original.date_of_loss),
  },
  {
    accessorKey: 'loss_description',
    header: 'Description',
    cell: ({ row }) => (
      <p className="truncate max-w-[200px]">{row.original.loss_description}</p>
    )
  },
];