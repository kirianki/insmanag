'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';

import { Renewal } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RenewalPayload } from '@/services/renewalService';

/**
 * Schema: ensure premium_estimate is coerced to number | undefined.
 * We use preprocess to convert '', null, undefined or numeric strings properly.
 */
const renewalSchema = z.object({
  renewal_date: z.string().min(1, 'Renewal date is required.'),
  current_insurer: z.string().min(1, 'Current insurer is required.'),
  policy_type_description: z.string().min(1, 'Policy type is required.'),
  premium_estimate: z
    .preprocess((val) => {
      // allow number, numeric string, '' (treated as undefined), null/undefined
      if (val === '' || val === null || val === undefined) return undefined;
      // If the incoming value is already a number, return it
      if (typeof val === 'number') return val;
      // Try to coerce strings to number
      if (typeof val === 'string') {
        const n = Number(val.replace(/,/g, '')); // strip commas if present
        return Number.isNaN(n) ? undefined : n;
      }
      return undefined;
    }, z.number().optional())
    .optional(),
  notes: z.string().optional(),
});

type RenewalFormData = z.infer<typeof renewalSchema>;

interface RenewalFormProps {
  customerId: string;
  renewal?: Renewal;
  onSubmit: (data: RenewalPayload) => void;
  isPending: boolean;
  onCancel: () => void;
}

export function RenewalForm({
  customerId,
  renewal,
  onSubmit,
  isPending,
  onCancel,
}: RenewalFormProps) {
  // cast resolver to the exact Resolver type expected by useForm to avoid the TypeScript mismatch
  const resolver = zodResolver(renewalSchema) as Resolver<RenewalFormData>;

  const form = useForm<RenewalFormData>({
    resolver,
    defaultValues: {
      renewal_date: renewal
        ? format(parseISO(renewal.renewal_date), 'yyyy-MM-dd')
        : '',
      current_insurer: renewal?.current_insurer || '',
      policy_type_description: renewal?.policy_type_description || '',
      premium_estimate:
        renewal?.premium_estimate !== undefined && renewal?.premium_estimate !== null
          ? Number(renewal.premium_estimate)
          : undefined,
      notes: renewal?.notes || '',
    },
  });

  const handleFormSubmit = (data: RenewalFormData) => {
    const payload: RenewalPayload = {
      ...data,
      customer: customerId,
      // backend expects string (as in your original code). Keep that behavior.
      premium_estimate:
        data.premium_estimate !== undefined
          ? data.premium_estimate.toString()
          : undefined,
    };
    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="renewal_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Renewal Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="current_insurer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Insurer</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jubilee Insurance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="policy_type_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Motor Private" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="premium_estimate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Premium Estimate (KES)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  // keep input friendly: show empty string for undefined
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Customer is looking for better rates..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Renewal'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
