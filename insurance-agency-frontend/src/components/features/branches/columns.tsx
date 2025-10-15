'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AgencyBranch } from '../../../types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { MoreHorizontal } from 'lucide-react';

export type BranchColumnDef = ColumnDef<AgencyBranch> & {
  meta?: {
    editBranch: (branch: AgencyBranch) => void;
    deleteBranch: (branchId: string) => void;
  }
}

export const branchColumns: BranchColumnDef[] = [
  { accessorKey: 'branch_name', header: 'Name' },
  { accessorKey: 'branch_code', header: 'Code' },
  { accessorKey: 'city', header: 'City' },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const branch = row.original;
      const { meta } = column.columnDef;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => meta?.editBranch(branch)}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => meta?.deleteBranch(branch.id)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];