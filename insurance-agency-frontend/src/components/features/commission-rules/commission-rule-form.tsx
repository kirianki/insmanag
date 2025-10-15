'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { CommissionRuleFormValues, commissionRuleFormSchema } from './commission-rule-form-schema';
import { PolicyType, InsuranceProvider } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

// API Fetchers for the dropdowns
const fetchPolicyTypes = async (): Promise<{ results: PolicyType[] }> => {
  const { data } = await api.get('/policy-types/');
  return data;
};
const fetchProviders = async (): Promise<{ results: InsuranceProvider[] }> => {
  const { data } = await api.get('/insurance-providers/');
  return data;
};

interface CommissionRuleFormProps {
  onSubmit: (values: CommissionRuleFormValues) => void;
  isPending: boolean;
}

export function CommissionRuleForm({ onSubmit, isPending }: CommissionRuleFormProps) {
  const { data: policyTypesData } = useQuery({ queryKey: ['policyTypes'], queryFn: fetchPolicyTypes });
  const { data: providersData } = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });

  const form = useForm<CommissionRuleFormValues>({
    resolver: zodResolver(commissionRuleFormSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="provider" render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Provider (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="All Providers" /></SelectTrigger></FormControl>
                <SelectContent>
                  {providersData?.results.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="policy_type" render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="All Policy Types" /></SelectTrigger></FormControl>
                <SelectContent>
                  {policyTypesData?.results.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField control={form.control} name="payout_basis" render={({ field }) => (
            <FormItem>
              <FormLabel>Payout Basis</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a basis" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="AGENCY_COMMISSION">Agency Commission</SelectItem>
                  <SelectItem value="TOTAL_PREMIUM">Total Premium</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="rate_percentage" render={({ field }) => (
            <FormItem>
              <FormLabel>Rate (%)</FormLabel>
              <FormControl><Input type="number" placeholder="10.5" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving Rule...' : 'Add Rule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}