'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

const settleSchema = z.object({
  settled_amount: z.coerce.number().positive({ message: "Settlement amount must be a positive number." }),
});

type SettleFormValues = z.infer<typeof settleSchema>;

interface SettleClaimFormProps {
  onSubmit: (values: SettleFormValues) => void;
  isPending: boolean;
}

export function SettleClaimForm({ onSubmit, isPending }: SettleClaimFormProps) {
  const form = useForm<SettleFormValues>({
    resolver: zodResolver(settleSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="settled_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Settlement Amount</FormLabel>
              <FormControl><Input type="number" placeholder="2500.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Processing...' : 'Settle Claim'}
          </Button>
        </div>
      </form>
    </Form>
  );
}