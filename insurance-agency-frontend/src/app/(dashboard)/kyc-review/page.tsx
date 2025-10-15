'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { CustomerDocument, Customer } from '../../../types';
import { useAuth } from '../../../hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Terminal, Check, X, Download } from 'lucide-react';

// API Functions
const fetchPendingDocuments = async (): Promise<{ results: CustomerDocument[] }> => {
  const { data } = await api.get('/customer-documents/?verification_status=PENDING');
  return data;
};

const fetchCustomers = async (): Promise<{ results: Customer[] }> => {
  const { data } = await api.get('/customers/');
  return data;
};

// **THE BUG FIX:** Use the dedicated verify/reject endpoints
const verifyDocument = async (id: string) => {
  const { data } = await api.post(`/customer-documents/${id}/verify/`);
  return data;
};

const rejectDocument = async (id: string) => {
  const { data } = await api.post(`/customer-documents/${id}/reject/`);
  return data;
};

// **NEW:** Define a new type for the grouped data structure
type GroupedDocuments = {
  customerId: string;
  customerName: string;
  documents: CustomerDocument[];
};

export default function KycReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const hasAccess = user?.roles.includes('Branch Manager') || user?.roles.includes('Agency Admin') || user?.roles.includes('Superuser');

  const { data: documentsData, isLoading: areDocumentsLoading, error: documentsError } = useQuery({
    queryKey: ['pendingDocuments'],
    queryFn: fetchPendingDocuments,
    enabled: hasAccess,
  });

  const { data: customersData, isLoading: areCustomersLoading, error: customersError } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    enabled: hasAccess,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'verify' | 'reject' }) => {
      return action === 'verify' ? verifyDocument(id) : rejectDocument(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => alert(`Action failed: ${err.response?.data?.detail || err.message}`),
    onSettled: () => setUpdatingId(null),
  });

  // **THE UX FIX:** Group the documents by customer
  const documentsByCustomer = useMemo((): GroupedDocuments[] => {
    if (!documentsData || !customersData) return [];

    const customerMap = new Map(customersData.results.map(c => [c.id, `${c.first_name} ${c.last_name}`]));
    const grouped = new Map<string, GroupedDocuments>();

    documentsData.results.forEach(doc => {
      const customerName = customerMap.get(doc.customer) || 'Unknown Customer';
      if (!grouped.has(doc.customer)) {
        grouped.set(doc.customer, {
          customerId: doc.customer,
          customerName: customerName,
          documents: [],
        });
      }
      grouped.get(doc.customer)!.documents.push(doc);
    });

    return Array.from(grouped.values());
  }, [documentsData, customersData]);

  const handleUpdateStatus = (documentId: string, action: 'verify' | 'reject') => {
    setUpdatingId(documentId);
    mutation.mutate({ id: documentId, action });
  };

  const isLoading = areDocumentsLoading || areCustomersLoading;
  const error = documentsError || customersError;

  if (!hasAccess) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>You do not have permission to access this page.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) return <div>Loading documents for review...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">KYC Document Review</h1>
        {documentsData && <Badge variant="destructive">{documentsData.results.length} Pending</Badge>}
      </div>
      <p className="text-muted-foreground">
        Review the following documents and approve or reject them to complete customer verification.
      </p>

      {documentsByCustomer.length === 0 && (
        <Card className="text-center p-12">
          <CardContent>
            <Check className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">All Caught Up!</h3>
            <p className="mt-1 text-sm text-muted-foreground">There are no pending KYC documents to review.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {documentsByCustomer.map(({ customerId, customerName, documents }) => (
          <Card key={customerId}>
            <CardHeader>
              <CardTitle>{customerName}</CardTitle>
              <CardDescription>
                {documents.length} document(s) pending review for this customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Uploaded On</TableHead>
                    <TableHead>View</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_type}</TableCell>
                      <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.file} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" /> View
                          </a>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleUpdateStatus(doc.id, 'verify')}
                            disabled={updatingId === doc.id}
                          >
                            <Check className="h-4 w-4 mr-2" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleUpdateStatus(doc.id, 'reject')}
                            disabled={updatingId === doc.id}
                          >
                            <X className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}