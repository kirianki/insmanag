'use client';

import { ColumnDef } from '@tanstack/react-table';
import { CustomerDocument } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Check, X, Download } from 'lucide-react';

export type KycColumnDef = ColumnDef<CustomerDocument> & {
  meta?: {
    updateStatus: (documentId: string, status: 'VERIFIED' | 'REJECTED') => void;
    isUpdating: (documentId: string) => boolean;
  }
}

export const kycColumns: KycColumnDef[] = [
  { accessorKey: 'customer_name', header: 'Customer' },
  { accessorKey: 'document_type', header: 'Document Type' },
  {
    accessorKey: 'created_at',
    header: 'Uploaded On',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
  {
    id: 'view',
    cell: ({ row }) => (
      <Button variant="outline" size="sm" asChild>
        <a href={row.original.file} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4 mr-2" /> View Document
        </a>
      </Button>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, column }) => {
      const doc = row.original;
      const { meta } = column.columnDef;
      const isPending = meta?.isUpdating(doc.id);

      return (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={() => meta?.updateStatus(doc.id, 'VERIFIED')}
            disabled={isPending}
          >
            <Check className="h-4 w-4 mr-2" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => meta?.updateStatus(doc.id, 'REJECTED')}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>
      );
    },
  },
];