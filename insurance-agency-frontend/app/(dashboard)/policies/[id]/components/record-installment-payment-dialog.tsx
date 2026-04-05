'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recordInstallmentPayment } from '@/services/policyService';
import { PolicyInstallment, InstallmentPaymentRequest } from '@/types/api';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const formSchema = z.object({
    paid_on: z.string().min(1, "Date of payment is required."),
    transaction_reference: z.string().min(3, "M-Pesa reference is required."),
    amount: z.string().optional(), // Display purposes
});

type RecordInstallmentFormData = z.infer<typeof formSchema>;

interface RecordInstallmentPaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    policyId: string;
    installment: PolicyInstallment | null;
}

interface ErrorResponse {
    detail?: string;
}

export function RecordInstallmentPaymentDialog({ isOpen, setIsOpen, policyId, installment }: RecordInstallmentPaymentDialogProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const form = useForm<RecordInstallmentFormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paid_on: format(new Date(), 'yyyy-MM-dd'),
            transaction_reference: '',
            amount: installment?.amount || '',
        },
    });

    // Update default values when installment changes
    if (installment && form.getValues('amount') !== installment.amount && isOpen) {
        form.reset({
            paid_on: format(new Date(), 'yyyy-MM-dd'),
            transaction_reference: '',
            amount: installment.amount,
        });
    }

    const mutation = useMutation({
        mutationFn: (data: InstallmentPaymentRequest) =>
            recordInstallmentPayment(policyId, installment!.id, data),
        onSuccess: () => {
            toast.success('Payment Recorded', { description: `Installment payment was successfully recorded.` });
            queryClient.invalidateQueries({ queryKey: ['installments', policyId] });
            queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
            setIsOpen(false);
            form.reset();
        },
        onError: (err: AxiosError<ErrorResponse>) => {
            toast.error('Payment Failed', { description: err.response?.data?.detail || 'An unexpected error occurred.' });
        },
    });

    const onSubmit = (values: RecordInstallmentFormData) => {
        mutation.mutate({
            paid_on: values.paid_on,
            transaction_reference: values.transaction_reference,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Installment Payment</DialogTitle>
                    <DialogDescription>
                        Enter the M-Pesa transaction code to confirm payment for this installment.
                    </DialogDescription>
                </DialogHeader>

                {installment && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Amount Due</AlertTitle>
                        <AlertDescription>
                            The amount due for this installment is <strong>{Number(installment.amount).toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}</strong>.
                        </AlertDescription>
                    </Alert>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="paid_on"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
                                    <FormLabel>M-Pesa Reference / Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., SDR23X7Y9" {...field} />
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
