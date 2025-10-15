'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PolicyActivationFormValues, policyActivationFormSchema } from './policy-activation-form-schema';
import { Button } from '../../../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Input } from '../../../components/ui/input';

interface PolicyActivationFormProps {
  onSubmit: (values: PolicyActivationFormValues) => void;
  isPending: boolean;
}

export function PolicyActivationForm({ onSubmit, isPending }: PolicyActivationFormProps) {
  const form = useForm<PolicyActivationFormValues>({
    resolver: zodResolver(policyActivationFormSchema),
    defaultValues: {
      insurance_certificate_number: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="insurance_certificate_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Insurance Certificate Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter the official certificate number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Activating...' : 'Activate Policy'}
          </Button>
        </div>
      </form>
    </Form>
  );
}