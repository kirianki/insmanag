'use client';

import { ColumnDef } from '@tanstack/react-table';
// FIX: The data table receives InsuranceProviderList, not the full InsuranceProvider object
import { InsuranceProviderList } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

// FIX: The generic type should match the data being passed in (InsuranceProviderList)
export type ProviderColumnDef = ColumnDef<InsuranceProviderList> & {
  meta?: {
    editProvider: (provider: InsuranceProviderList) => void;
  }
}

export const providerColumns: ProviderColumnDef[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'phone_number', header: 'Phone' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
        {row.original.is_active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const provider = row.original;
      const { meta } = column.columnDef;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => meta?.editProvider(provider)}>Edit Provider</DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* FIX: Corrected the link to point to the commissions sub-page */}
              <DropdownMenuItem asChild>
                <Link href={`/settings/providers/${provider.id}/commissions`}>Manage Commissions</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];