'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { PolicyFormValues, policyFormSchema } from './policy-form-schema';
import { PolicyType, InsuranceProvider, Customer, PaginatedResponse } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';
import { Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import React, { useEffect } from 'react';

// API Fetchers
const fetchPolicyTypes = async (): Promise<PaginatedResponse<PolicyType>> => api.get('/policy-types/').then(res => res.data);
const fetchProviders = async (): Promise<PaginatedResponse<InsuranceProvider>> => api.get('/insurance-providers/').then(res => res.data);
const fetchCustomers = async (): Promise<PaginatedResponse<Customer>> => api.get('/customers/').then(res => res.data);

interface PolicyFormProps {
  onSubmit: (values: PolicyFormValues) => void;
  isPending: boolean;
  defaultCustomerId?: string;
}

export function PolicyForm({ onSubmit, isPending, defaultCustomerId }: PolicyFormProps) {
  const { data: policyTypesData } = useQuery({ queryKey: ['policyTypes'], queryFn: fetchPolicyTypes });
  const { data: providersData } = useQuery({ queryKey: ['providers'], queryFn: fetchProviders });
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    enabled: !defaultCustomerId,
  });

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      customer: defaultCustomerId || undefined,
      total_premium_amount: undefined,
      policy_start_date: '',
      policy_end_date: '',
      provider: undefined,
      policy_type: undefined,
      vehicle_registration_number: '',
      is_installment: false,
      installment_plan: [],
    }
  });

  // NEW: Hook for managing the dynamic installment plan array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "installment_plan"
  });
  
  const isInstallment = form.watch('is_installment');

  useEffect(() => {
    if (defaultCustomerId) {
      form.setValue('customer', defaultCustomerId);
    }
  }, [defaultCustomerId, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!defaultCustomerId && (
          <FormField
            control={form.control}
            name="customer"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Customer</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        {field.value
                          ? customersData?.results.find(c => c.id === field.value)?.first_name + ' ' + customersData?.results.find(c => c.id === field.value)?.last_name
                          : "Select a customer"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customersData?.results.map((customer) => (
                            <CommandItem value={`${customer.first_name} ${customer.last_name}`} key={customer.id} onSelect={() => form.setValue("customer", customer.id)}>
                              <Check className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                              {customer.first_name} {customer.last_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* ... Provider and Policy Type fields remain the same */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ... Start Date and End Date fields remain the same */}
        </div>

        <FormField control={form.control} name="total_premium_amount" render={({ field }) => ( // FIX: Renamed
          <FormItem>
            <FormLabel>Total Premium Amount</FormLabel>
            <FormControl><Input type="number" placeholder="25000.00" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="vehicle_registration_number" render={({ field }) => (
          <FormItem>
            <FormLabel>Vehicle Registration Number</FormLabel>
            <FormControl>
              <Input placeholder="KAA 123A" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* --- NEW: Installment Plan Section --- */}
        <FormField control={form.control} name="is_installment" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Is this an Installment Plan?</FormLabel>
              <FormDescription>If enabled, you can define a payment schedule.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        {isInstallment && (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold">Installment Plan</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField control={form.control} name={`installment_plan.${index}.due_date`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`installment_plan.${index}.amount`} render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => append({ due_date: '', amount: 0 })}>
              Add Installment
            </Button>
            <FormMessage>{form.formState.errors.installment_plan?.message}</FormMessage>
          </div>
        )}
        {/* --- End of Installment Plan Section --- */}

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating Policy...' : 'Create Policy'}
          </Button>
        </div>
      </form>
    </Form>
  );
}