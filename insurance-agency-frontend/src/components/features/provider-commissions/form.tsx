'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProviderCommissionFormValues, providerCommissionFormSchema } from './form-schema';
// FIX: The component no longer fetches its own data, so these are not needed here
// import { useQuery } from '@tanstack/react-query';
// import api from '../../../lib/api';
import { PolicyType } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

// FIX: The component now receives the list of policy types as a prop
interface ProviderCommissionFormProps {
  onSubmit: (values: ProviderCommissionFormValues) => void;
  isPending: boolean;
  policyTypes: PolicyType[]; // NEW: Accept policy types from the parent page
}

export function ProviderCommissionForm({ onSubmit, isPending, policyTypes }: ProviderCommissionFormProps) {
  // FIX: Removed the internal useQuery hook. The component is now "dumb" and just displays data it's given.
  const form = useForm<ProviderCommissionFormValues>({
    resolver: zodResolver(providerCommissionFormSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="policy_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a policy type" /></SelectTrigger></FormControl>
                <SelectContent>
                  {/* FIX: Map over the policyTypes prop passed from the parent */}
                  {policyTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="commission_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Business Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                  <SelectItem value="RENEWAL">Renewal</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="rate_percentage" render={({ field }) => (
          <FormItem>
            <FormLabel>Agency Commission Rate (%)</FormLabel>
            <FormControl><Input type="number" placeholder="15.00" step="0.01" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving Rule...' : 'Add Commission Rule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}