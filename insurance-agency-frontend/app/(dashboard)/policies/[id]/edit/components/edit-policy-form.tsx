'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

import { Policy } from '@/types/api';
import { updatePolicy } from '@/services/policyService';
import { useToast } from '@/lib/hooks';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

// Zod schema with all editable fields
const formSchema = z
  .object({
    premium_amount: z.number().min(0.01, 'Premium amount must be greater than 0'),
    sum_insured: z.number().optional().or(z.literal(undefined)),
    deductible: z.number().optional().or(z.literal(undefined)),
    policy_start_date: z.date(),
    policy_end_date: z.date(),
    vehicle_registration_number: z.string().optional(),
    insurance_certificate_number: z.string().optional(),
  })
  .refine((data) => data.policy_end_date > data.policy_start_date, {
    message: 'End date must be after start date',
    path: ['policy_end_date'],
  });

type FormValues = z.infer<typeof formSchema>;

interface EditPolicyFormProps {
  policy: Policy;
}

export function EditPolicyForm({ policy }: EditPolicyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      premium_amount: parseFloat(policy.premium_amount),
      sum_insured: policy.sum_insured ? parseFloat(policy.sum_insured) : undefined,
      deductible: policy.deductible ? parseFloat(policy.deductible) : undefined,
      policy_start_date: new Date(policy.policy_start_date!),
      policy_end_date: new Date(policy.policy_end_date!),
      vehicle_registration_number: policy.vehicle_registration_number || '',
      insurance_certificate_number: policy.insurance_certificate_number || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Policy>) => updatePolicy(policy.id, data),
    onSuccess: () => {
      toast.success('Policy Updated', {
        description: 'The policy has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['policy', policy.id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      router.push(`/policies/${policy.id}`);
      router.refresh();
    },
    onError: (err: Error) => {
      const errorMessage =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        'An error occurred while updating the policy.';
      toast.error('Update Failed', { description: errorMessage });
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      premium_amount: values.premium_amount.toString(),
      sum_insured: values.sum_insured?.toString(),
      deductible: values.deductible?.toString(),
      policy_start_date: format(values.policy_start_date, 'yyyy-MM-dd'),
      policy_end_date: format(values.policy_end_date, 'yyyy-MM-dd'),
    };

    mutation.mutate(payload);
  };

  const isRecurring = policy.policy_type_detail?.payment_structure === 'RECURRING_FEE';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Policy Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Premium Amount */}
            <FormField
              control={form.control}
              name="premium_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isRecurring ? 'Recurring Fee Amount (KES)' : 'Total Premium Amount (KES)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sum Insured & Deductible (only for non-recurring policies) */}
            {!isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sum_insured"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sum Insured (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deductible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deductible / Excess (KES)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Policy Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="policy_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Policy Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="policy_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Policy End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < form.getValues('policy_start_date')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vehicle Registration (conditional) */}
            {policy.policy_type_detail?.requires_vehicle_reg && (
              <FormField
                control={form.control}
                name="vehicle_registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Registration Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Insurance Certificate Number */}
            <FormField
              control={form.control}
              name="insurance_certificate_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Certificate Number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}