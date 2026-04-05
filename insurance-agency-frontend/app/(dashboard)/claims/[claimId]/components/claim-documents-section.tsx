// app/(dashboard)/claims/[claimId]/components/claim-documents-section.tsx

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadClaimDocument } from '@/services/claimService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Paperclip } from 'lucide-react';
import { useToast } from '@/lib/hooks';

// We need to add getClaimDocuments to the service file
// For now, let's assume it exists and we'll add it in the next step.
import { api } from '@/lib/api';
import { PaginatedClaimDocumentList } from '@/types/api';
export const getClaimDocuments = (claimId: string) => api.get<PaginatedClaimDocumentList>(`/claims/claims/${claimId}/documents/`).then(res => res.data);


export function ClaimDocumentsSection({ claimId }: { claimId: string }) {
  const [isUploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['claimDocuments', claimId],
    queryFn: () => getClaimDocuments(claimId),
    enabled: !!claimId,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadClaimDocument(claimId, formData),
    onSuccess: () => {
        toast.success("Document uploaded successfully!");
        queryClient.invalidateQueries({ queryKey: ['claimDocuments', claimId] });
        setUploadOpen(false);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error("Upload failed", { description: error.message });
      } else {
        toast.error("Upload failed", { description: "An unexpected error occurred." });
      }
    }
  });
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const docType = (document.getElementById('document_type') as HTMLInputElement).value;
    if (file && docType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', docType);
        uploadMutation.mutate(formData);
    } else {
        toast.error("Missing file or document type.");
    }
  };

  return (
    <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold"><Paperclip className="h-5 w-5" /> Attached Documents</CardTitle>
            <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Uploaded On</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
                    ) : documentsData?.results.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center h-24">No documents uploaded.</TableCell></TableRow>
                    ) : (
                        documentsData?.results.map(doc => (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium">{doc.document_type}</TableCell>
                                <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <a href={doc.file} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Download
                                        </a>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
        <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Upload New Document</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2"><Label htmlFor="document_type">Document Type</Label><Input id="document_type" placeholder="e.g., Police Report, Photo" /></div>
                    <div className="grid gap-2"><Label htmlFor="file">File</Label><Input id="file" type="file" onChange={handleFileUpload} disabled={uploadMutation.isPending} /></div>
                </div>
            </DialogContent>
        </Dialog>
    </Card>
  );
}