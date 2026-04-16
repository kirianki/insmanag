'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';

import { createClaim } from '@/services/claimService';
import { api, fetchAllPages } from '@/lib/api';
import { useToast } from '@/lib/hooks';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SearchableCombobox } from '@/components/shared/SearchableCombobox';

// Define minimal types for the dropdown data
interface SimpleCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface SimplePolicy {
  id: string;
  policy_number: string;
  provider_name?: string;
}

// API Helpers
const getCustomers = () =>
  fetchAllPages<SimpleCustomer>('/customers/', { page_size: 500 });

const getPolicies = (customerId: string) =>
  fetchAllPages<SimplePolicy>('/policies/', { customer: customerId, page_size: 500 });

const formSchema = z.object({
  customer: z.string().uuid("Please select a customer."),
  policy: z.string().uuid("Please select a policy."),
  date_of_loss: z.string().min(1, "Date of loss is required."),
  loss_description: z.string().min(10, "Description must be at least 10 characters."),
  // Using coerce allows the form to handle the string input from HTML and convert to number
  estimated_loss_amount: z.coerce.number().optional(),
});

// Infer the type from the schema for use in submission handlers
type ClaimFormData = z.infer<typeof formSchema>;

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export function FileClaimForm({ onSuccess }: { onSuccess: (newId: string) => void }) {
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch] = useDebounce(customerSearch, 300);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer: '',
      policy: '',
      date_of_loss: '',
      loss_description: '',
      estimated_loss_amount: 0
    }
  });

  const selectedCustomerId = form.watch('customer');

  // Fetch Customers for Dropdown (Load all once)
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => getCustomers(),
  });

  // Fetch Policies for Selected Customer
  const { data: policies = [], isLoading: isLoadingPolicies } = useQuery({
    queryKey: ['policies', selectedCustomerId],
    queryFn: () => getPolicies(selectedCustomerId as string),
    enabled: !!selectedCustomerId
  });

  const mutation = useMutation({
    mutationFn: (data: ClaimFormData) => createClaim({
      claimant: data.customer,
      policy: data.policy,
      date_of_loss: data.date_of_loss,
      loss_description: data.loss_description,
      estimated_loss_amount: data.estimated_loss_amount
    }),
    onSuccess: (resp) => {
      toast.success("Claim Filed Successfully");
      onSuccess(resp.data.id);
    },
    onError: (err: unknown) => {
      const error = err as ApiError;
      toast.error("Submission Failed", {
        description: error?.response?.data?.detail || "Please check your inputs."
      });
    }
  });

  const onSubmit = (data: ClaimFormData) => mutation.mutate(data);

  // Filtering logic for customer search
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return [];
    const search = customerSearch.toLowerCase();
    return customers.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        {/* Customer Selection */}
        <FormField control={form.control} name="customer" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Customer</FormLabel>
            <SearchableCombobox
              options={filteredCustomers.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name} (${c.phone})`
              }))}
              value={field.value}
              onSelect={(val) => {
                field.onChange(val);
                form.setValue('policy', ''); // Reset policy if customer changes
              }}
              onSearchChange={setCustomerSearch}
              placeholder="Select customer..."
              isLoading={isLoadingCustomers}
            />
            <FormMessage />
          </FormItem>
        )} />

        {/* Policy Selection (Dependent on Customer) */}
        <FormField control={form.control} name="policy" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Policy</FormLabel>
            <SearchableCombobox
              options={policies.map((p) => ({
                value: p.id,
                label: `${p.policy_number} - ${p.provider_name || 'Policy'}`
              }))}
              value={field.value}
              onSelect={field.onChange}
              placeholder={selectedCustomerId ? "Select policy..." : "Select a customer first"}
              disabled={!selectedCustomerId || isLoadingPolicies}
              isLoading={isLoadingPolicies}
            />
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="date_of_loss" render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Loss</FormLabel>
              <FormControl><Input type="date" {...field} max={new Date().toISOString().split('T')[0]} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="estimated_loss_amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Est. Amount (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  // Explicitly cast the value to string or number to satisfy strict HTML types
                  // We fall back to '' to ensure controlled input state
                  value={field.value as string | number | undefined ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="loss_description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description of Incident</FormLabel>
            <FormControl>
              <Textarea placeholder="Describe what happened in detail..." className="min-h-[100px]" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit Claim"}
          </Button>
        </div>
      </form>
    </Form>
  );
}