'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';

import api from '../../../../lib/api';
import { Claim } from '../../../../types';
import { useAuth } from '../../../../hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '../../../../components/ui/dialog';
import { SettleClaimForm } from '../../../../components/features/claims/settle-claim-form';
import { ClaimDocumentForm } from '../../../../components/features/claim-documents/form';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../lib/utils';

// API Functions
const fetchClaimById = async (id: string): Promise<Claim> => api.get(`/claims/claims/${id}/`).then(res => res.data);
const approveClaim = (id: string) => api.post(`/claims/claims/${id}/approve/`, {});
const rejectClaim = (id: string) => api.post(`/claims/claims/${id}/reject/`, {});
const settleClaim = ({ id, settled_amount }: { id: string, settled_amount: number }) => api.post(`/claims/claims/${id}/settle/`, { settled_amount });
const uploadClaimDocument = async (formData: FormData & { claim: string }) => {
  formData.append('claim', formData.claim);
  const { data } = await api.post('/claims/claim-documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export default function ClaimDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const claimId = params.claimId as string;

  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const { data: claim, isLoading, error } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => fetchClaimById(claimId),
    enabled: !!claimId,
  });

  const statusMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') => {
      if (action === 'approve') return approveClaim(claimId);
      return rejectClaim(claimId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
    onError: (err) => alert(`Action failed: ${err.message}`),
  });

  const settleMutation = useMutation({
    mutationFn: settleClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setIsSettleDialogOpen(false);
    },
    onError: (err) => alert(`Settle action failed: ${err.message}`),
  });

  const documentMutation = useMutation({
    mutationFn: (formData: FormData) => uploadClaimDocument(Object.assign(formData, { claim: claimId })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      setIsUploadDialogOpen(false);
      alert('Document uploaded successfully!');
    },
    onError: (err) => alert(`Upload failed: ${err.message}`),
  });

  const isManagerOrAdmin = user?.roles.includes('Branch Manager') || user?.roles.includes('Agency Admin');
  const isActionable = claim && !['SETTLED', 'REJECTED', 'CLOSED'].includes(claim.status);

  if (isLoading) return <div className="p-4">Loading claim details...</div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load claim.</AlertDescription></Alert>;
  if (!claim) return <div>Claim not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Claim #{claim.claim_number}</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">Policy: {claim.policy_number}</p>
            <p className="text-muted-foreground">Claimant: {claim.claimant_name}</p>
          </div>
        </div>
        <Badge className={cn("text-lg", {
          'bg-blue-500 text-white': claim.status === 'FNOL' || claim.status === 'UNDER_REVIEW' || claim.status === 'AWAITING_DOCS',
          'bg-green-600 text-white': claim.status === 'APPROVED' || claim.status === 'SETTLED',
          'bg-red-600 text-white': claim.status === 'REJECTED',
          'bg-gray-500 text-white': claim.status === 'CLOSED',
        })}>{claim.status.replace(/_/g, ' ')}</Badge>
      </div>

      {isManagerOrAdmin && isActionable && (
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-4">
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => statusMutation.mutate('approve')}>Approve</Button>
            <Button variant="destructive" onClick={() => statusMutation.mutate('reject')}>Reject</Button>
            <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
              <DialogTrigger asChild><Button variant="outline">Settle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settle Claim</DialogTitle>
                  <DialogDescription>Enter the final settlement amount. This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <SettleClaimForm
                  onSubmit={(values) => settleMutation.mutate({ id: claimId, ...values })}
                  isPending={settleMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Claim Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="font-semibold">Date of Loss</p><p>{new Date(claim.date_of_loss).toLocaleDateString()}</p></div>
            <div><p className="font-semibold">Description</p><p className="text-muted-foreground">{claim.loss_description}</p></div>
            <div className="grid grid-cols-2">
              <div><p className="font-semibold">Estimated Amount</p><p>{claim.estimated_amount ? `$${claim.estimated_amount}` : 'N/A'}</p></div>
              <div><p className="font-semibold">Settled Amount</p><p>{claim.settled_amount ? `$${claim.settled_amount}` : 'N/A'}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Supporting Documents</CardTitle>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild><Button size="sm">Upload</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document to Claim #{claim.claim_number}</DialogTitle>
                  <DialogDescription>Select the document type and file to attach to this claim.</DialogDescription>
                </DialogHeader>
                <ClaimDocumentForm
                  onSubmit={documentMutation.mutate}
                  isPending={documentMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {claim.documents.length > 0 ? (
              <ul className="space-y-2">
                {claim.documents.map(doc => (
                  <li key={doc.id}><a href={doc.file} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted"><span>{doc.document_type}</span><Download className="h-4 w-4 text-muted-foreground" /></a></li>
                ))}
              </ul>
            ) : (<p className="text-sm text-muted-foreground">No documents uploaded.</p>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}