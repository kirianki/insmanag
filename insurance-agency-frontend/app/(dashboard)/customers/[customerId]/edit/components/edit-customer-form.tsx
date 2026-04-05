// app/(dashboard)/customers/[customerId]/edit/components/edit-customer-form.tsx

'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { updateCustomer } from '@/services/customerService';
import { useToast } from '@/lib/hooks';
import { Customer } from '@/types/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema for editable fields.
const customerFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  id_number: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface EditCustomerFormProps {
  customer: Customer;
}

interface ErrorResponse {
  response?: {
    data?: {
      detail?: string;
    };
  };
}

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    // Pre-fill the form with the existing customer data
    defaultValues: {
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        id_number: customer.id_number || ""
    }
  });

  const mutation = useMutation({
    mutationFn: (data: CustomerFormData) => updateCustomer(customer.id, data),
    onSuccess: (response) => {
      const updatedCustomer = response.data;
      toast.success('Customer Updated', {
        description: `Customer ${updatedCustomer.first_name} ${updatedCustomer.last_name} has been updated.`,
      });
      // Invalidate queries to refetch fresh data on the list and detail pages
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      // Navigate back to the customer detail page
      router.push(`/customers/${customer.id}`);
    },
    onError: (error: unknown) => {
      const errorResponse = error as ErrorResponse;
      const errorMessage = errorResponse.response?.data?.detail || 'An unexpected error occurred.';
      toast.error('Update Failed', { description: errorMessage });
    },
  });

  function onSubmit(data: CustomerFormData) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="id_number" render={({ field }) => (<FormItem><FormLabel>ID Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}