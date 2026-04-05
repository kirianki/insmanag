// app/(dashboard)/policies/[policyId]/components/activate-policy-dialog.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { activatePolicy } from '@/services/policyService';
import { Policy, PolicyActivationRequest } from '@/types/api';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  insurance_certificate_number: z.string().min(1, 'Certificate number is required'),
});

interface ActivatePolicyDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  policy: Policy;
}

interface ErrorResponse {
  detail?: string;
}

export function ActivatePolicyDialog({ isOpen, setIsOpen, policy }: ActivatePolicyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      insurance_certificate_number: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PolicyActivationRequest) => activatePolicy(policy.id, data),
    onSuccess: () => {
      toast.success('Policy Activated', { description: `Policy #${policy.policy_number} is now active.` });
      queryClient.invalidateQueries({ queryKey: ['policy', policy.id] });
      setIsOpen(false);
    },
    onError: (err: AxiosError<ErrorResponse>) => {
      toast.error('Activation Failed', { description: err.response?.data?.detail || 'An error occurred.' });
    },
  });
  
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate Policy #{policy.policy_number}</DialogTitle>
          <DialogDescription>
            Enter the insurance certificate number to activate this policy. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="insurance_certificate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Certificate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CERT-123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Activating...' : 'Activate'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}