'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllDocuments, verifyCustomerDocument, rejectCustomerDocument, deleteAdminDocument } from '@/services/customerService';
import { CustomerDocument, VerificationStatus } from '@/types/api';
import { ColumnDef, PaginationState, Row } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, FileText, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';

const getBadgeVariant = (status: VerificationStatus): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
        case 'VERIFIED': return 'default';
        case 'REJECTED': return 'destructive';
        case 'EXPIRED': return 'destructive';
        default: return 'secondary';
    }
};

export default function KycManagementPage() {
    const [rejectDialogState, setRejectDialogState] = useState<{ isOpen: boolean; docId: string; customerId: string }>({ isOpen: false, docId: '', customerId: '' });
    const [verifyDialogState, setVerifyDialogState] = useState<{ isOpen: boolean; docId: string; customerId: string }>({ isOpen: false, docId: '', customerId: '' });
    const [deleteDialogState, setDeleteDialogState] = useState<{ isOpen: boolean; docId: string }>({ isOpen: false, docId: '' });
    const [rejectionReason, setRejectionReason] = useState('');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data, isLoading } = useQuery({
        queryKey: ['allDocuments', searchQuery, pagination.pageIndex],
        queryFn: () => getAllDocuments({
            search: searchQuery,
            page: pagination.pageIndex + 1,
            page_size: pagination.pageSize
        }).then(res => res.data),
    });

    // For visual grouping: identify if a row is the first for its customer
    const results = data?.results || [];

    const verifyMutation = useMutation({
        mutationFn: ({ customerId, docId, notes }: { customerId: string, docId: string, notes?: string }) =>
            verifyCustomerDocument(customerId, docId, notes),
        onSuccess: () => {
            toast.success("Document verified successfully");
            queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
            setVerifyDialogState({ isOpen: false, docId: '', customerId: '' });
            setVerificationNotes('');
        },
        onError: (error: unknown) => {
            if (error instanceof Error) {
                toast.error("Verification failed", { description: error.message });
            } else {
                toast.error("Verification failed", { description: "An unexpected error occurred." });
            }
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ customerId, docId, reason }: { customerId: string, docId: string, reason: string }) =>
            rejectCustomerDocument(customerId, docId, reason),
        onSuccess: () => {
            toast.success("Document rejected");
            queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
            setRejectDialogState({ isOpen: false, docId: '', customerId: '' });
            setRejectionReason('');
        },
        onError: (error: unknown) => {
            if (error instanceof Error) {
                toast.error("Rejection failed", { description: error.message });
            } else {
                toast.error("Rejection failed", { description: "An unexpected error occurred." });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (docId: string) => deleteAdminDocument(docId),
        onSuccess: () => {
            toast.success("Document deleted");
            queryClient.invalidateQueries({ queryKey: ['allDocuments'] });
            setDeleteDialogState({ isOpen: false, docId: '' });
        },
        onError: (error: unknown) => {
            if (error instanceof Error) {
                toast.error("Deletion failed", { description: error.message });
            } else {
                toast.error("Deletion failed", { description: "An unexpected error occurred." });
            }
        }
    });

    const columns: ColumnDef<CustomerDocument>[] = [
        {
            accessorKey: "customer.customer_number",
            header: "Customer",
            cell: ({ row }: { row: Row<CustomerDocument> }) => {
                const customer = row.original.customer;
                const isFirstForCustomer = row.index === 0 || results[row.index - 1].customer.id !== customer.id;

                if (!isFirstForCustomer) return <div className="invisible h-0" />;

                return (
                    <div className="py-1">
                        <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                        <div className="text-xs text-muted-foreground">{customer.customer_number}</div>
                    </div>
                );
            }
        },
        { accessorKey: "document_type", header: "Type" },
        { accessorKey: "document_number", header: "Doc Num", cell: ({ row }: { row: Row<CustomerDocument> }) => row.original.document_number || '-' },
        { accessorKey: "expiry_date", header: "Expiry", cell: ({ row }: { row: Row<CustomerDocument> }) => row.original.expiry_date || '-' },
        {
            accessorKey: "verification_status",
            header: "Status",
            cell: ({ row }: { row: Row<CustomerDocument> }) => <Badge variant={getBadgeVariant(row.original.verification_status)}>{row.original.verification_status}</Badge>
        },
        { accessorKey: "created_at", header: "Uploaded", cell: ({ row }: { row: Row<CustomerDocument> }) => new Date(row.original.created_at).toLocaleDateString() },
        {
            id: "actions",
            cell: ({ row }: { row: Row<CustomerDocument> }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => window.open(row.original.file, '_blank')}>
                        <FileText className="mr-2 h-4 w-4" /> View Document
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setVerifyDialogState({ isOpen: true, docId: row.original.id, customerId: row.original.customer.id })}
                            disabled={row.original.verification_status === 'VERIFIED'}
                        >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Verify
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setRejectDialogState({ isOpen: true, docId: row.original.id, customerId: row.original.customer.id })}
                            disabled={row.original.verification_status === 'REJECTED'}
                        >
                            <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reject
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setDeleteDialogState({ isOpen: true, docId: row.original.id })}
                            className="text-red-500 hover:bg-red-50 focus:bg-red-50"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="KYC Management"
                action={
                    <div className="flex items-center gap-2 w-full max-w-sm">
                        <Input
                            placeholder="Filter by customer name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.results.filter((d: CustomerDocument) => d.verification_status === 'PENDING').length || 0}</div>
                    </CardContent>
                </Card>
                {/* Add more statistics as needed */}
            </div>

            <DataTable
                columns={columns}
                data={results}
                isLoading={isLoading}
                pageCount={data?.count ? Math.ceil(data.count / pagination.pageSize) : 0}
                pagination={pagination}
                setPagination={setPagination}
                getRowClassName={(row) => {
                    const isFirstForCustomer = row.index === 0 || results[row.index - 1].customer.id !== row.original.customer.id;
                    return isFirstForCustomer ? 'border-t-2 border-muted' : '';
                }}
            />

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogState.isOpen} onOpenChange={(open: boolean) => !open && setRejectDialogState(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Document</DialogTitle>
                        <DialogDescription>Please provide a reason for rejecting this document.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label>Rejection Reason</Label>
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Image blurry, Expired document..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogState(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ customerId: rejectDialogState.customerId, docId: rejectDialogState.docId, reason: rejectionReason })}
                            disabled={!rejectionReason || rejectMutation.isPending}
                        >
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deletion Dialog */}
            <Dialog open={deleteDialogState.isOpen} onOpenChange={(open: boolean) => !open && setDeleteDialogState(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Document</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this document? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogState(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(deleteDialogState.docId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Verification Dialog (Optional Notes) */}
            <Dialog open={verifyDialogState.isOpen} onOpenChange={(open: boolean) => !open && setVerifyDialogState(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verify Document</DialogTitle>
                        <DialogDescription>Optionally add internal notes.</DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Internal reference..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVerifyDialogState(prev => ({ ...prev, isOpen: false }))}>Cancel</Button>
                        <Button
                            onClick={() => verifyMutation.mutate({ customerId: verifyDialogState.customerId, docId: verifyDialogState.docId, notes: verificationNotes })}
                            disabled={verifyMutation.isPending}
                        >
                            Verify
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
