'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClaimFormValues, claimFormSchema } from './claim-form-schema';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';

interface ClaimFormProps {
  onSubmit: (values: ClaimFormValues) => void;
  isPending: boolean;
}

export function ClaimForm({ onSubmit, isPending }: ClaimFormProps) {
  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      date_of_loss: new Date().toISOString().split('T')[0],
      loss_description: '',
      // **FIX:** Initialize the optional number field. Since the input type is number,
      // an empty string is the correct default value for an empty field.
      estimated_amount: undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="date_of_loss" render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Loss</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="loss_description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description of Loss</FormLabel>
            <FormControl><Textarea placeholder="Describe what happened..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="estimated_amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated Claim Amount (Optional)</FormLabel>
            <FormControl><Input type="number" placeholder="500.00" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>
      </form>
    </Form>
  );
}