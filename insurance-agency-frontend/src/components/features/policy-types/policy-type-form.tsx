'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PolicyTypeFormValues, policyTypeFormSchema } from './policy-type-form-schema';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Switch } from '../../../components/ui/switch';

interface PolicyTypeFormProps {
  onSubmit: (values: PolicyTypeFormValues) => void;
  isPending: boolean;
  defaultValues?: Partial<PolicyTypeFormValues>;
}

export function PolicyTypeForm({ onSubmit, isPending, defaultValues }: PolicyTypeFormProps) {
  const form = useForm<PolicyTypeFormValues>({
    resolver: zodResolver(policyTypeFormSchema),
    defaultValues: { name: '', requires_vehicle_reg: false, is_active: true, ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Policy Type Name</FormLabel>
            <FormControl><Input placeholder="e.g., Motor Private, Home Insurance" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="requires_vehicle_reg" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Requires Vehicle Registration?</FormLabel>
              <FormDescription>Enable if this policy type requires a vehicle number.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="is_active" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5"><FormLabel>Active</FormLabel></div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Policy Type'}
          </Button>
        </div>
      </form>
    </Form>
  );
}