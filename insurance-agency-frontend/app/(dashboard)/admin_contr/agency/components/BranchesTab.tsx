'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBranches, createBranch, updateBranch } from '@/services/accountsService';
import { AgencyBranch } from '@/types/api';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const branchSchema = z.object({
  branch_name: z.string().min(1, "Branch name is required"),
  branch_code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});
type BranchFormData = z.infer<typeof branchSchema>;

// Form component for creating/editing branches
function BranchForm({ branch, onSubmit, isPending }: { branch?: AgencyBranch | null, onSubmit: (data: BranchFormData) => void, isPending: boolean }) {
  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      branch_name: branch?.branch_name || "",
      branch_code: branch?.branch_code || "",
      address: branch?.address || "",
      city: branch?.city || ""
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="branch_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Branch Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="branch_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Branch Code</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
        )}/>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Branch"}
        </Button>
      </form>
    </Form>
  );
}

// Main tab component
export function BranchesTab({ agencyId }: { agencyId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<AgencyBranch | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['branches', agencyId],
    queryFn: () => getBranches(agencyId).then(res => res.data),
    enabled: !!agencyId,
  });

  const mutation = useMutation({
    mutationFn: (branchData: BranchFormData) => {
      if (selectedBranch?.id) {
        return updateBranch(agencyId, selectedBranch.id, branchData);
      }
      return createBranch(agencyId, branchData);
    },
    onSuccess: () => {
      toast.success(selectedBranch ? "Branch updated" : "Branch created");
      queryClient.invalidateQueries({ queryKey: ['branches', agencyId] });
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error("Failed", { description: error.message });
      } else {
        toast.error("Failed", { description: "An unexpected error occurred." });
      }
    },
  });

  
  const columns: ColumnDef<AgencyBranch>[] = [
    { accessorKey: "branch_name", header: "Branch Name" },
    { accessorKey: "branch_code", header: "Code" },
    { accessorKey: "city", header: "City" },
    { id: "actions", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelectedBranch(row.original); setDialogOpen(true); }}>
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )},
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Manage Branches</CardTitle>
            <CardDescription>View, create, and edit your agency&apos;s branches.</CardDescription>
          </div>
          <Button onClick={() => { setSelectedBranch(null); setDialogOpen(true); }}>Add Branch</Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={data?.results || []} isLoading={isLoading} />
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBranch ? "Edit Branch" : "Create New Branch"}</DialogTitle>
          </DialogHeader>
          <BranchForm branch={selectedBranch} onSubmit={(data) => mutation.mutate(data)} isPending={mutation.isPending} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}