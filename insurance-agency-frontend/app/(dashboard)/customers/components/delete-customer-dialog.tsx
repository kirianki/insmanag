// app/(dashboard)/customers/components/delete-customer-dialog.tsx

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCustomer } from '@/services/customerService';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customerId: string;
  customerName: string;
}

interface ErrorResponse {
  detail?: string;
}

export function DeleteCustomerDialog({ isOpen, setIsOpen, customerId, customerName }: DeleteCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteCustomer(customerId),
    onSuccess: () => {
      toast.success('Customer Deleted', { description: `${customerName} has been successfully deleted.` });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
            This action cannot be undone. This will permanently delete the customer{' '}
            <span className="font-semibold text-foreground">{customerName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()} disabled={mutation.isPending} className="bg-destructive hover:bg-destructive/90">
            {mutation.isPending ? 'Deleting...' : 'Yes, Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}