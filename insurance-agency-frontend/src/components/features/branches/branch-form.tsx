'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

const formSchema = z.object({
  branch_name: z.string().min(3, { message: "Branch name is required." }),
  branch_code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export type BranchFormValues = z.infer<typeof formSchema>;

interface BranchFormProps {
  onSubmit: (values: BranchFormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<BranchFormValues>;
}

export function BranchForm({ onSubmit, isPending, defaultValues }: BranchFormProps) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { branch_name: '', branch_code: '', address: '', city: '', ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="branch_name" render={({ field }) => (
          <FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="branch_code" render={({ field }) => (
          <FormItem><FormLabel>Branch Code (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="city" render={({ field }) => (
          <FormItem><FormLabel>City (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Branch'}</Button>
        </div>
      </form>
    </Form>
  );
}