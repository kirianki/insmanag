'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPolicyTypes, createPolicyType, updatePolicyType, deletePolicyType } from '@/services/policyService';
import { PolicyType } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
// --- NEW: Import Select component for the new dropdown ---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- CHANGE #1: Add payment_structure to the Zod schema ---
const policyTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  requires_vehicle_reg: z.boolean(),
  is_active: z.boolean(),
  payment_structure: z.enum(['PREMIUM_BASED', 'RECURRING_FEE']),
});
type PolicyTypeFormData = z.infer<typeof policyTypeSchema>;

interface ApiError {
  message?: string;
  response?: { data?: { detail?: string; }; };
}

function PolicyTypeForm({ policyType, onSubmit, isPending }: { policyType?: PolicyType | null, onSubmit: (data: PolicyTypeFormData) => void, isPending: boolean }) {
  const form = useForm<PolicyTypeFormData>({
    resolver: zodResolver(policyTypeSchema),
    defaultValues: {
      name: policyType?.name || "",
      requires_vehicle_reg: policyType?.requires_vehicle_reg ?? false,
      is_active: policyType?.is_active ?? true,
      // --- CHANGE #2: Set default value for the new field ---
      payment_structure: policyType?.payment_structure || 'PREMIUM_BASED',
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Policy Type Name</FormLabel><FormControl><Input placeholder="e.g., Medical Cover (Family)" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* --- CHANGE #3: Add the new dropdown field to the form --- */}
        <FormField
          control={form.control}
          name="payment_structure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Structure</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how this policy is paid for" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PREMIUM_BASED">Premium Based (e.g., Motor, Property)</SelectItem>
                  <SelectItem value="RECURRING_FEE">Recurring Fee (e.g., Medical, Life)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="requires_vehicle_reg" render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Requires Vehicle Registration</FormLabel></FormItem>
        )} />
        <FormField control={form.control} name="is_active" render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Is Active</FormLabel></FormItem>
        )} />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save Policy Type"}</Button>
        </div>
      </form>
    </Form>
  );
}

export function PolicyTypesTab({ agencyId }: { agencyId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PolicyType | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState<string>('all');
  const [paymentStructure, setPaymentStructure] = useState<string>('all');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['policyTypes', agencyId, page, search, isActive, paymentStructure],
    queryFn: () => getPolicyTypes(agencyId, {
      page,
      search,
      is_active: isActive === 'all' ? undefined : isActive === 'active',
      payment_structure: paymentStructure === 'all' ? undefined : paymentStructure,
    }).then(res => res.data),
    enabled: !!agencyId,
  });

  const mutation = useMutation({
    mutationFn: (formData: PolicyTypeFormData) => {
      const apiData = { ...formData, agency: agencyId };
      if (selectedType?.id) {
        return updatePolicyType(agencyId, selectedType.id, apiData);
      }
      return createPolicyType(agencyId, apiData);
    },
    onSuccess: () => {
      toast.success(selectedType ? "Policy Type updated" : "Policy Type created");
      queryClient.invalidateQueries({ queryKey: ['policyTypes', agencyId] });
      // Invalidate dropdown data cache so create form gets the new type
      queryClient.invalidateQueries({ queryKey: ['create-policy-dropdown'] });
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.detail || apiError.message || 'Operation failed';
      toast.error("Failed", { description: errorMessage });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (typeId: string) => deletePolicyType(agencyId, typeId),
    onSuccess: () => {
      toast.success("Policy Type deleted");
      queryClient.invalidateQueries({ queryKey: ['policyTypes', agencyId] });
      queryClient.invalidateQueries({ queryKey: ['create-policy-dropdown'] });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage = apiError.response?.data?.detail || apiError.message || 'Delete failed';
      toast.error("Delete failed", { description: errorMessage });
    },
  });

  // --- CHANGE #4: Add payment_structure to the table columns ---
  const columns: ColumnDef<PolicyType>[] = [
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "payment_structure",
      header: "Payment Structure",
      cell: ({ row }: { row: { original: PolicyType } }) => row.original.payment_structure === 'RECURRING_FEE' ? 'Recurring Fee' : 'Premium Based'
    },
    { header: "Requires Vehicle Reg", cell: ({ row }: { row: { original: PolicyType } }) => row.original.requires_vehicle_reg ? "Yes" : "No" },
    { header: "Status", cell: ({ row }: { row: { original: PolicyType } }) => row.original.is_active ? "Active" : "Inactive" },
    {
      id: "actions", cell: ({ row }: { row: { original: PolicyType } }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelectedType(row.original); setDialogOpen(true); }}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMutation.mutate(row.original.id)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Manage Policy Types</CardTitle>
            <CardDescription>Create and configure the types of policies your agency sells.</CardDescription>
          </div>
          <Button onClick={() => { setSelectedType(null); setDialogOpen(true); }}>Add Policy Type</Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search policy types..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={isActive}
              onValueChange={(v: string) => { setIsActive(v); setPage(1); }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={paymentStructure}
              onValueChange={(v: string) => { setPaymentStructure(v); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Structure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Structures</SelectItem>
                <SelectItem value="PREMIUM_BASED">Premium Based</SelectItem>
                <SelectItem value="RECURRING_FEE">Recurring Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data?.results || []} isLoading={isLoading} />

        {/* Pagination Controls */}
        {data && (data.previous || data.next) && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing page {page} with {data.results.length} of {data.count} types
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={!data.previous}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data.next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedType ? "Edit Policy Type" : "Create New Policy Type"}</DialogTitle>
          </DialogHeader>
          <PolicyTypeForm policyType={selectedType} onSubmit={(data) => mutation.mutate(data)} isPending={mutation.isPending} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}