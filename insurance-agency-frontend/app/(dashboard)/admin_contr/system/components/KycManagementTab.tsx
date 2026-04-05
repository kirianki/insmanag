'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, verifyDocument, rejectDocument, DocumentFilterParams } from '@/services/documentService';
// Ensure this import path is correct for your project structure
import { CustomerDocument } from '@/types/api';
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table';
import { useToast } from '@/lib/hooks';

import { DataTable } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Download, Check, X } from 'lucide-react';
import Link from 'next/link';

export function KycManagementTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [rejectionTarget, setRejectionTarget] = useState<CustomerDocument | null>(null);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);

  const queryParams: DocumentFilterParams = {
    verification_status: 'PENDING',
    page: pageIndex + 1,
    page_size: pageSize,
    ordering: sorting.map(s => `${s.desc ? '-' : ''}${s.id}`).join(',') || undefined,
  };
  
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['pendingDocuments', queryParams],
    queryFn: () => getDocuments(queryParams).then(res => res.data),
    placeholderData: (previousData) => previousData,
  });

  const documents = documentsData?.results || [];
  const pageCount = documentsData?.count ? Math.ceil(documentsData.count / pageSize) : 0;

  const approveMutation = useMutation({
    mutationFn: (documentId: string) => verifyDocument(documentId),
    onSuccess: () => {
        toast.success("Document Approved");
        queryClient.invalidateQueries({ queryKey: ['pendingDocuments'] });
        queryClient.invalidateQueries({ queryKey: ['customerDocuments'] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        toast.error("Approval Failed", { description: err.message });
      } else {
        toast.error("Approval Failed", { description: "An unexpected error occurred." });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (documentId: string) => rejectDocument(documentId),
    onSuccess: () => {
        toast.success("Document Rejected");
        queryClient.invalidateQueries({ queryKey: ['pendingDocuments'] });
        queryClient.invalidateQueries({ queryKey: ['customerDocuments'] });
        setRejectionTarget(null);
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        toast.error("Rejection Failed", { description: err.message });
      } else {
        toast.error("Rejection Failed", { description: "An unexpected error occurred." });
      }
    },
  });
  
  const columns: ColumnDef<CustomerDocument>[] = [
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: ({ row }) => {
        const customer = row.original.customer;
        // This line will now pass the type check because `customer` is a `CustomerSummary` object
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer';

        return (
          <Button variant="link" asChild className="p-0 h-auto font-medium">
            <Link href={`/customers/${customer.id}`}>
                {customerName}
            </Link>
          </Button>
        );
      }
    },
    { header: 'Document Type', accessorKey: 'document_type' },
    {
      header: 'Uploaded On',
      accessorKey: 'created_at',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const doc = row.original;
        const isApproving = approveMutation.isPending && approveMutation.variables === doc.id;
        const isRejecting = rejectMutation.isPending && rejectMutation.variables === doc.id;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="icon" asChild className="h-8 w-8">
              <a href={doc.file} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </a>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRejectionTarget(doc)} disabled={isApproving || isRejecting}>
              <X className="h-4 w-4" />
              <span className="sr-only">Reject</span>
            </Button>
            <Button size="icon" className="h-8 w-8" onClick={() => approveMutation.mutate(doc.id)} disabled={isApproving || isRejecting}>
              <Check className="h-4 w-4" />
              <span className="sr-only">Approve</span>
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>KYC Document Verification Queue</CardTitle>
          <CardDescription>
            Review and process customer documents that are pending verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={documents}
            isLoading={isLoading}
            pageCount={pageCount}
            pagination={{ pageIndex, pageSize }}
            setPagination={setPagination}
            sorting={sorting}
            setSorting={setSorting}
            emptyStateMessage="No pending documents to review."
          />
        </CardContent>
      </Card>

      {/* Rejection Confirmation Dialog */}
      <AlertDialog open={!!rejectionTarget} onOpenChange={() => setRejectionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reject this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will mark the document as REJECTED for customer{' '}
              <span className="font-semibold">
                {rejectionTarget?.customer ? `${rejectionTarget.customer.first_name} ${rejectionTarget.customer.last_name}` : ''}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => rejectMutation.mutate(rejectionTarget!.id)}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Yes, Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}