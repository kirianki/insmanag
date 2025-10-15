'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Renewal } from '../../../types';

export const renewalColumns: ColumnDef<Renewal>[] = [
  { accessorKey: 'renewal_date', header: 'Renewal Date', cell: ({ row }) => new Date(row.original.renewal_date).toLocaleDateString() },
  { accessorKey: 'policy_type_description', header: 'Policy Type' },
  { accessorKey: 'current_insurer', header: 'Current Insurer' },
  { accessorKey: 'premium_estimate', header: 'Premium Estimate', cell: ({ row }) => row.original.premium_estimate ? `$${row.original.premium_estimate}` : 'N/A' },
];