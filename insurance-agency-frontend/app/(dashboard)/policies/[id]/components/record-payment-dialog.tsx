'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordRecurringPayment, RecurringPaymentRequest } from '@/services/policyService';
import { Policy } from '@/types/api';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// --- THIS IS THE DEFINITIVE FIX ---
// 1. The schema now expects a `string` for the amount field, which is what HTML inputs provide.
// 2. We use `refine` to perform the numeric validation on that string. This avoids the type conflict
//    that was happening between the resolver and the form hook.
const formSchema = z.object({
  amount: z.string().min(1, "Amount is required.")
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number.",
    }),
  transaction_reference: z.string().optional(),
});

// The TypeScript type is inferred from the corrected schema.
type RecordPaymentFormData = z.infer<typeof formSchema>;

interface RecordPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  policy: Policy;
}

interface ErrorResponse {
  detail?: string;
}

export function RecordPaymentDialog({ isOpen, setIsOpen, policy }: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isRecurring = policy.policy_type_detail.payment_structure === 'RECURRING_FEE';

  const form = useForm<RecordPaymentFormData>({
    resolver: zodResolver(formSchema),
    // The default values must now provide a `string` for the amount.
    defaultValues: {
      amount: isRecurring ? String(policy.premium_amount) : String(policy.balance_due),
      transaction_reference: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RecurringPaymentRequest) => recordRecurringPayment(policy.id, data),
    onSuccess: () => {
      toast.success('Payment Recorded', { description: `Payment for policy #${policy.policy_number} was successful.` });
      queryClient.invalidateQueries({ queryKey: ['policy', policy.id] });
      setIsOpen(false);
      form.reset();
    },
    onError: (err: AxiosError<ErrorResponse>) => {
      toast.error('Payment Failed', { description: err.response?.data?.detail || 'An unexpected error occurred.' });
    },
  });
  
  const onSubmit = (values: RecordPaymentFormData) => {
    // The `amount` is already a valid string, so it can be sent directly to the mutation.
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment for {policy.policy_number}</DialogTitle>
          <DialogDescription>
            Enter the payment details below. This action will be logged.
          </DialogDescription>
        </DialogHeader>
        
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{isRecurring ? "Recurring Fee" : "Outstanding Balance"}</AlertTitle>
            <AlertDescription>
                The current {isRecurring ? `recurring fee is` : `balance due is`} <strong>{Number(isRecurring ? policy.premium_amount : policy.balance_due).toLocaleString('en-KE', {style: 'currency', currency: 'KES'})}</strong>.
            </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="transaction_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bank Slip #, M-Pesa Code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}