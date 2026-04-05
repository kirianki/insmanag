// app/(dashboard)/policies/[id]/components/cancel-policy-dialog.tsx

'use client';

import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Policy } from '@/types/api';
import { updatePolicyStatus } from '@/services/policyService';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface CancelPolicyDialogProps {
  policy: Policy;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: () => void;
}

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export function CancelPolicyDialog({
  policy,
  isOpen,
  setIsOpen,
  onSuccess,
}: CancelPolicyDialogProps) {
  const { toast } = useToast();
  const [cancellationReason, setCancellationReason] = React.useState('');

  const mutation = useMutation({
    // --- THIS LINE IS NOW CORRECT ---
    // The function call now matches the updated service, expecting only two arguments.
    mutationFn: () => updatePolicyStatus(policy.id, 'CANCELLED'),
    onSuccess: () => {
      toast.success('Policy Cancelled', {
        description: 'Policy has been successfully cancelled.',
      });
      setIsOpen(false);
      setCancellationReason('');
      onSuccess();
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      console.error('Cancellation error:', error);

      // More detailed error handling
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          'Failed to cancel policy. Please try again.';

      toast.error('Cancellation Failed', {
        description: errorMessage,
      });
    },
  });

  const handleCancel = () => {
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Policy
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel policy #{policy.policy_number}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium">
              Warning: Cancelling this policy will:
            </p>
            <ul className="text-sm text-destructive/80 mt-2 space-y-1 list-disc list-inside">
              <li>Immediately terminate the policy coverage</li>
              <li>Stop any future installment payments</li>
              <li>Make the policy inactive in the system</li>
              {policy.status === 'ACTIVE' && (
                <li>May require refund processing</li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">Cancellation Reason (Optional)</Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Enter reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={mutation.isPending}
          >
            Keep Policy
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Cancelling...' : 'Yes, Cancel Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}