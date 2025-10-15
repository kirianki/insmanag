'use client';

import { ColumnDef } from '@tanstack/react-table';
import { CustomerDocument } from '../../../types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ArrowDownToLine } from 'lucide-react';

export const documentColumns: ColumnDef<CustomerDocument>[] = [
  {
    accessorKey: 'document_type',
    header: 'Document Type',
  },
  {
    accessorKey: 'verification_status',
    header: 'Status',
    cell: ({ row }) => <Badge variant="secondary">{row.original.verification_status}</Badge>,
  },
  {
    accessorKey: 'created_at',
    header: 'Uploaded On',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        asChild // Use asChild to make the button a link
      >
        <a href={row.original.file} target="_blank" rel="noopener noreferrer">
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          Download
        </a>
      </Button>
    ),
  },
];