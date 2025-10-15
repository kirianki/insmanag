'use client';

import { ColumnDef } from '@tanstack/react-table';
import { User } from '../../../types'; // We'll add the Customer type here soon

// First, let's update our types file to include Customer
// This is based on the Customer schema in your OpenAPI spec
export type Customer = {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  // We'll need to fetch the agent's name separately or adjust the API if needed
  // For now, we'll just show the ID.
  assigned_agent: string;
};

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'customer_number',
    header: 'Customer ID',
  },
  {
    // Combine first and last name into one column
    accessorKey: 'first_name',
    header: 'Name',
    cell: ({ row }) => {
      const customer = row.original;
      return `${customer.first_name} ${customer.last_name}`;
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'kyc_status',
    header: 'KYC Status',
  },
  // We can add an actions column later for view/edit/delete
];