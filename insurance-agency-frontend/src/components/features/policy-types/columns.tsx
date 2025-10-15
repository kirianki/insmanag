'use client';

import { ColumnDef } from '@tanstack/react-table';
import { PolicyType } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { MoreHorizontal } from 'lucide-react';

export type PolicyTypeColumnDef = ColumnDef<PolicyType> & {
  meta?: {
    editPolicyType: (policyType: PolicyType) => void;
  }
}

export const policyTypeColumns: PolicyTypeColumnDef[] = [
  { accessorKey: 'name', header: 'Name' },
  {
    accessorKey: 'requires_vehicle_reg',
    header: 'Requires Vehicle Reg.',
    cell: ({ row }) => (row.original.requires_vehicle_reg ? 'Yes' : 'No'),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'outline'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const policyType = row.original;
      const { meta } = column.columnDef;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => meta?.editPolicyType(policyType)}>Edit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];