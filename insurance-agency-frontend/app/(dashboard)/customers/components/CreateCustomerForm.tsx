// app/(dashboard)/customers/components/CreateCustomerForm.tsx

'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer } from '@/services/customerService';
import { useToast } from '@/lib/hooks';
import { AxiosError } from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const customerFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  id_number: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CreateCustomerFormProps {
  onSuccess: () => void;
}

interface ErrorResponse {
  detail?: string;
}

export function CreateCustomerForm({ onSuccess }: CreateCustomerFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { first_name: "", last_name: "", phone: "", email: "", id_number: "" }
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (response) => {
      // FIX: Access the nested data object from the axios response
      const newCustomer = response.data; 
      toast.success('Customer Created', {
        description: `Customer ${newCustomer.first_name} ${newCustomer.last_name} has been successfully created.`,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      const errorMessage = error.response?.data?.detail || 'An unexpected error occurred.';
      toast.error('Creation Failed', { description: errorMessage });
    },
  });

  function onSubmit(data: CustomerFormData) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="id_number" render={({ field }) => (<FormItem><FormLabel>ID Number (Optional)</FormLabel><FormControl><Input placeholder="National ID or Passport" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
        </form>
    </Form>
  );
}