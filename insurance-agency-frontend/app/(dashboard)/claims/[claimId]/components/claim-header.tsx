'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Claim, SettleClaimRequest } from '@/types/api';
import {
  approveClaim,
  rejectClaim,
  settleClaim,
  startReview,
  deleteClaim
} from '@/services/claimService';
import { useAuth } from '@/lib/auth';
import { getUserRoles } from '@/lib/utils';
import { useToast } from '@/lib/hooks';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoreVertical, Trash2, PlayCircle, CheckCircle, XCircle, DollarSign } from 'lucide-react';

// --- Types ---

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    }
  }
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getStatusBadgeVariant = (status?: string): BadgeVariant => {
  if (!status) return 'outline';
  if (['APPROVED', 'SETTLED'].includes(status)) return 'default';
  if (['FNOL', 'UNDER_REVIEW', 'AWAITING_DOCS'].includes(status)) return 'secondary';
  return 'destructive';
};

const getStatusValue = (status: Claim['status']): string => {
  if (typeof status === 'object' && status !== null && 'value' in status) {
    return (status as { value: string }).value;
  }
  return status as string;
};

// --- Helper Components ---

function SettleClaimDialog({ claim, isOpen, setIsOpen }: { claim: Claim, isOpen: boolean, setIsOpen: (open: boolean) => void }) {
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (data: SettleClaimRequest) => settleClaim(claim.id, data),
    onSuccess: () => {
      toast.success("Claim Settled");
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
      setIsOpen(false);
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast.error("Failed to Settle", { description: error?.response?.data?.detail || "Error occurred" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Claim</DialogTitle>
          <DialogDescription>Enter final settlement amount.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="amount">Amount (KES)</Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ settled_amount: amount })} disabled={mutation.isPending}>
            {mutation.isPending ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Component ---

export function ClaimHeader({ claim }: { claim: Claim }) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userRoles = getUserRoles(user);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Permissions
  const isAgencyAdmin = userRoles.includes('Agency Admin');
  const canManage = isAgencyAdmin || userRoles.includes('Branch Manager');

  // Helper to safely get string status
  const claimStatus = getStatusValue(claim.status);

  // --- Mutations ---

  const reviewMutation = useMutation({
    mutationFn: () => startReview(claim.id),
    onSuccess: () => {
      toast.success("Review Started");
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast.error("Failed to start review", { description: error?.response?.data?.detail || "Error occurred" });
    }
  });

  const actionMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') => action === 'approve' ? approveClaim(claim.id) : rejectClaim(claim.id),
    onSuccess: (_, action) => {
      toast.success(`Claim ${action === 'approve' ? 'Approved' : 'Rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['claim', claim.id] });
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast.error("Action Failed", { description: error?.response?.data?.detail || "Error occurred" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteClaim(claim.id),
    onSuccess: () => {
      toast.success("Claim Deleted");
      router.push('/claims');
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast.error("Delete Failed", { description: error?.response?.data?.detail || "Error occurred" });
    }
  });

  return (
    <>
      <SettleClaimDialog claim={claim} isOpen={isSettleOpen} setIsOpen={setIsSettleOpen} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this claim and its documents.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{claim.claim_number}</h1>
          <Badge variant={getStatusBadgeVariant(claimStatus)} className="text-sm">
            {claim.status_display}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isAuthLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <>
              {/* 1. FNOL Action */}
              {canManage && claimStatus === 'FNOL' && (
                <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
                  <PlayCircle className="mr-2 h-4 w-4" /> Start Review
                </Button>
              )}

              {/* 2. Review Actions */}
              {canManage && ['UNDER_REVIEW', 'AWAITING_DOCS'].includes(claimStatus) && (
                <>
                  <Button variant="outline" onClick={() => actionMutation.mutate('approve')} disabled={actionMutation.isPending}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => actionMutation.mutate('reject')} disabled={actionMutation.isPending}>
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </>
              )}

              {/* 3. Approved Action */}
              {canManage && claimStatus === 'APPROVED' && (
                <Button onClick={() => setIsSettleOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <DollarSign className="mr-2 h-4 w-4" /> Settle Claim
                </Button>
              )}

              {/* 4. More Actions Dropdown (Delete) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {isAgencyAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsDeleteOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Claim</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </>
  );
}