'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PayoutBatch } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';

const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

export const payoutBatchColumns: ColumnDef<PayoutBatch>[] = [
  {
    accessorKey: 'id',
    header: 'Batch ID',
    cell: ({ row }) => <p className="font-mono text-xs">{row.original.id}</p>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={cn({
            'bg-blue-500': status === 'PROCESSING',
            'bg-green-600': status === 'COMPLETED',
            'bg-red-600': status === 'FAILED',
          })}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Date Created',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: 'initiated_by_email',
    header: 'Initiated By',
  },
];