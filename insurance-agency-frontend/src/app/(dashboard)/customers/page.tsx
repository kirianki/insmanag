'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { columns, Customer } from '../../../components/features/customers/columns';
import { DataTable } from '../../../components/shared/data-table';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription, // **FIX:** Import DialogDescription
} from '../../../components/ui/dialog';
import { CustomerForm } from '../../../components/features/customers/customer-form';
import { CustomerFormValues } from '../../../components/features/customers/customer-form-schema';

type PaginatedCustomersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

const fetchCustomers = async (): Promise<PaginatedCustomersResponse> => {
  const { data } = await api.get('/customers/');
  return data;
};

const createCustomer = async (customerData: CustomerFormValues): Promise<Customer> => {
  const { data } = await api.post('/customers/', customerData);
  return data;
};

export default function CustomersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error("Failed to create customer", error);
    }
  });

  const handleCreateCustomer = (values: CustomerFormValues) => {
    mutation.mutate(values);
  };

  const handleRowClick = (customer: Customer) => {
    router.push(`/customers/${customer.id}`);
  };

  if (isLoading) return <div>Loading customers...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Customer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create a New Customer</DialogTitle>
              {/* **FIX:** Add a descriptive sentence for screen readers. */}
              <DialogDescription>
                Fill in the details below. The new customer will be assigned to you automatically.
              </DialogDescription>
            </DialogHeader>
            <CustomerForm onSubmit={handleCreateCustomer} isPending={mutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        columns={columns}
        data={data?.results || []}
        onRowClick={handleRowClick}
        filterColumnId="first_name"
        filterPlaceholder="Filter by first name..."
      />
    </div>
  );
}