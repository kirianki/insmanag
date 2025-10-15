'use client';

import { ColumnDef } from '@tanstack/react-table';
import { StaffCommissionRule } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Trash2 } from 'lucide-react';

export type CommissionRuleColumnDef = ColumnDef<StaffCommissionRule> & {
  meta?: {
    deleteRule: (ruleId: string) => void;
  }
}

export const commissionRuleColumns: CommissionRuleColumnDef[] = [
  // **NEW:** Add a column to show which user the rule belongs to.
  // We'll need to ensure our API response includes the user's name.
  {
    accessorKey: 'user_name', // Assuming the API can provide this
    header: 'User',
    cell: ({ row }) => row.original.user_name || <span className="text-muted-foreground">N/A</span>,
  },
  {
    accessorKey: 'provider_name',
    header: 'Provider',
    cell: ({ row }) => row.original.provider_name || <span className="text-muted-foreground">Any</span>,
  },
  {
    accessorKey: 'policy_type_name',
    header: 'Policy Type',
    cell: ({ row }) => row.original.policy_type_name || <span className="text-muted-foreground">Any</span>,
  },
  {
    accessorKey: 'payout_basis',
    header: 'Basis',
    cell: ({ row }) => row.original.payout_basis.replace('_', ' '),
  },
  {
    accessorKey: 'rate_percentage',
    header: 'Rate',
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