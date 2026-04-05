//path: app/%28dashboard%29/policies/components/delete-policy-dialog.tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { deletePolicy } from '@/services/policyService';
import { useToast } from '@/lib/hooks';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeletePolicyDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  policyId: string;
  policyNumber: string;
}

interface ErrorResponse {
  detail?: string;
}

export function DeletePolicyDialog({ isOpen, setIsOpen, policyId, policyNumber }: DeletePolicyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deletePolicy(policyId),
    onSuccess: () => {
      toast.success('Policy Deleted', { description: `Policy #${policyNumber} has been successfully deleted.` });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setIsOpen(false);
    },
    onError: (err: AxiosError<ErrorResponse>) => {
      toast.error('Deletion Failed', { description: err.response?.data?.detail || 'An error occurred.' });
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete policy{' '}
            <span className="font-semibold text-foreground">#{policyNumber}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {mutation.isPending ? 'Deleting...' : 'Yes, Delete Policy'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}