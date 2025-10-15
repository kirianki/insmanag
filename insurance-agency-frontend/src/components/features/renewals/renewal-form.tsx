'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

const formSchema = z.object({
  current_insurer: z.string().min(2, { message: "Insurer name is required." }),
  policy_type_description: z.string().min(3, { message: "Policy type is required." }),
  renewal_date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "A valid date is required." }),
  premium_estimate: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

export type RenewalFormValues = z.infer<typeof formSchema>;

interface RenewalFormProps {
  onSubmit: (values: RenewalFormValues) => void;
  isPending: boolean;
}

export function RenewalForm({ onSubmit, isPending }: RenewalFormProps) {
  const form = useForm<RenewalFormValues>({ resolver: zodResolver(formSchema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="current_insurer" render={({ field }) => (
          <FormItem><FormLabel>Current Insurer</FormLabel><FormControl><Input placeholder="e.g., Jubilee" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="policy_type_description" render={({ field }) => (
          <FormItem><FormLabel>Policy Type</FormLabel><FormControl><Input placeholder="e.g., Motor Private" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="renewal_date" render={({ field }) => (
          <FormItem><FormLabel>Renewal Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="premium_estimate" render={({ field }) => (
          <FormItem><FormLabel>Premium Estimate (Optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Log Renewal'}</Button>
        </div>
      </form>
    </Form>
  );
}