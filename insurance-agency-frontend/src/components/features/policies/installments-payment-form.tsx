'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Calendar } from '../../ui/calendar';
import { cn } from '../../../lib/utils';

export const installmentPaymentSchema = z.object({
  paid_on: z.date({
    required_error: "A payment date is required.",
  }),
  transaction_reference: z.string().optional(),
});

export type InstallmentPaymentFormValues = z.infer<typeof installmentPaymentSchema>;

interface InstallmentPaymentFormProps {
  onSubmit: (values: InstallmentPaymentFormValues) => void;
  isPending: boolean;
}

export function InstallmentPaymentForm({ onSubmit, isPending }: InstallmentPaymentFormProps) {
  const form = useForm<InstallmentPaymentFormValues>({
    resolver: zodResolver(installmentPaymentSchema),
    defaultValues: {
      paid_on: new Date(),
      transaction_reference: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="paid_on"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Payment</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
          name="transaction_reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Reference (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., M-PESA code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Form>
  );
}