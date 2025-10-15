'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ProviderCommissionStructure } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Trash2 } from 'lucide-react'



export type ProviderCommissionColumnDef = ColumnDef<ProviderCommissionStructure> & {
  meta?: {
    deleteRule: (ruleId: string) => void;
  }
}

export const providerCommissionColumns: ProviderCommissionColumnDef[] = [
  {
    accessorKey: 'policy_type_name',
    header: 'Policy Type',
  },
  {
    accessorKey: 'commission_type',
    header: 'Business Type',
    cell: ({ row }) => row.original.commission_type.replace('_', ' '),
  },
  {
    accessorKey: 'rate_percentage',
    header: 'Agency Rate',
    cell: ({ row }) => `${parseFloat(row.original.rate_percentage).toFixed(2)}%`,
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const rule = row.original;
      const { meta } = column.columnDef;
      return (
        <div className="text-right">
          <Button variant="ghost" size="icon" onClick={() => meta?.deleteRule(rule.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      );
    },
  },
];