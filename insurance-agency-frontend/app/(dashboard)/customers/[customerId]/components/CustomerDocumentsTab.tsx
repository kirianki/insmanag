'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomerDocuments, uploadCustomerDocument } from '@/services/customerService';
import { CustomerDocument, VerificationStatus } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Upload, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks';

// --- FIX: This function now returns only the variants that are allowed by the Badge component ---
const getBadgeVariant = (status: VerificationStatus): 'default' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'VERIFIED':
      return 'default'; // 'default' is typically a prominent color (e.g., black or blue)
    case 'REJECTED':
      return 'destructive'; // 'destructive' is red, which is correct
    case 'PENDING':
    default:
      return 'secondary'; // 'secondary' is typically a muted grey, perfect for pending status
  }
};

const documentColumns: ColumnDef<CustomerDocument>[] = [
  { accessorKey: "document_type", header: "Document Type" },
  {
    accessorKey: "verification_status",
    header: "Status",
    // This cell renderer now uses the corrected function and will pass the type check
    cell: ({ row }) => {
      const status = row.original.verification_status;
      return <Badge variant={getBadgeVariant(status)}>{status}</Badge>;
    }
  },
  { accessorKey: "created_at", header: "Uploaded On", cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString() },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
              onClick={() => {
                window.open(row.original.file, '_blank');
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];


export function CustomerDocumentsTab({ customerId }: { customerId: string }) {
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['customerDocuments', customerId],
    queryFn: () => getCustomerDocuments(customerId).then(res => res.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadCustomerDocument(customerId, formData),
    onSuccess: () => {
      toast.success("Document uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ['customerDocuments', customerId] });
      setUploadOpen(false);
      // Reset form
      setFile(null);
      setDocType('');
      setDocNumber('');
      setExpiryDate('');
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error("Upload failed", { description: error.message });
      } else {
        toast.error("Upload failed", { description: "An unexpected error occurred." });
      }
    }
  });

  const handleSearch = () => {
    if (!file || !docType) {
      toast.error("Please provide a file and document type.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);
    if (docNumber) formData.append('document_number', docNumber);
    if (expiryDate) formData.append('expiry_date', expiryDate);

    uploadMutation.mutate(formData);
  };

  const extendedColumns: ColumnDef<CustomerDocument>[] = [
    ...documentColumns.slice(0, 2), // Keep Type and Status
    { accessorKey: "document_number", header: "Doc Number", cell: ({ row }) => row.original.document_number || '-' },
    { accessorKey: "expiry_date", header: "Expiry Date", cell: ({ row }) => row.original.expiry_date ? new Date(row.original.expiry_date).toLocaleDateString() : '-' },
    ...documentColumns.slice(2) // Keep Uploaded On and Actions
  ];

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Upload Document</Button>
      </div>
      <DataTable
        columns={extendedColumns}
        data={data?.results || []}
        isLoading={isLoading}
      />
      <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Input
                id="document_type"
                placeholder="e.g., National ID, Passport"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document_number">Document Number (Optional)</Label>
              <Input
                id="document_number"
                placeholder="e.g., A1234567"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
              <Input
                id="expiry_date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSearch} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}