// app/(dashboard)/policies/[policyId]/components/update-status-dialog.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePolicyStatus } from '@/services/policyService';
import { Policy, PolicyStatus } from '@/types/api';
import { useToast } from '@/lib/hooks';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  status: z.custom<PolicyStatus>((val) => typeof val === 'string' && val.length > 0, 'Status is required'),
  cancellation_reason: z.string().optional(),
}).refine(data => {
    if (data.status === 'CANCELLED') {
        return !!data.cancellation_reason && data.cancellation_reason.length > 0;
    }
    return true;
}, {
    message: 'Cancellation reason is required when cancelling a policy.',
    path: ['cancellation_reason'],
});

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

interface UpdateStatusDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  policy: Policy;
}

export function UpdateStatusDialog({ isOpen, setIsOpen, policy }: UpdateStatusDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: undefined, cancellation_reason: '' },
  });

  const mutation = useMutation({
    // --- THIS IS NOW CORRECT ---
    // The mutation now calls the simplified service function.
    // The cancellation_reason is collected for UI validation but not sent to the API.
    mutationFn: (data: z.infer<typeof formSchema>) => updatePolicyStatus(policy.id, data.status),
    onSuccess: (data) => {
      toast.success('Status Updated', { description: `Policy status changed to ${data.data.status_display}.` });
      queryClient.invalidateQueries({ queryKey: ['policy', policy.id] });
      setIsOpen(false);
    },
    onError: (err: ApiError) => {
      toast.error('Update Failed', { description: err.response?.data?.detail || err.message || 'An error occurred.' });
    },
  });

  const watchedStatus = form.watch('status');
  const onSubmit = (values: z.infer<typeof formSchema>) => mutation.mutate(values);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Status for #{policy.policy_number}</DialogTitle>
          <DialogDescription>Current status: <strong>{policy.status_display}</strong></DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Status</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a new status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {/* --- THIS IS NOW CORRECT --- */}
                        {/* Statuses match the allowed choices in the backend serializer */}
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="LAPSED">Lapsed</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedStatus === 'CANCELLED' && (
               <FormField
                control={form.control}
                name="cancellation_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Cancellation</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide a reason for cancelling the policy..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}