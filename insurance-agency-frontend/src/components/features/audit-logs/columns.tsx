'use client';

import { ColumnDef } from '@tanstack/react-table';
import { SystemLog } from '../../../types';

// Use a more detailed date format for logs
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const auditLogColumns: ColumnDef<SystemLog>[] = [
  {
    accessorKey: 'created_at',
    header: 'Timestamp',
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    accessorKey: 'user_email',
    header: 'User',
  },
  {
    accessorKey: 'action_type',
    header: 'Action',
  },
  {
    accessorKey: 'details',
    header: 'Details',
  },
  {
    accessorKey: 'ip_address',
    header: 'IP Address',
  },
];