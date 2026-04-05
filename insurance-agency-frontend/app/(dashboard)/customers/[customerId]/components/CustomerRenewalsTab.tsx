// app/(dashboard)/customers/[customerId]/components/CustomerRenewalsTab.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRenewals, createRenewal, updateRenewal, deleteRenewal, RenewalFilterParams, RenewalPayload } from '@/services/renewalService';
import { Renewal } from '@/types/api';
import { format, differenceInDays, isFuture } from 'date-fns';
import { useToast } from '@/lib/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { RenewalForm } from './RenewalForm';

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
      detail?: string;
    };
  };
}

export function CustomerRenewalsTab({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState<Renewal | undefined>(undefined);

  const queryParams: RenewalFilterParams = { 
    customer: customerId, 
    ordering: 'renewal_date' 
  };

  const { data: renewalsData, isLoading } = useQuery({
    queryKey: ['customerRenewals', customerId],
    queryFn: () => getRenewals(queryParams).then(res => res.data),
    enabled: !!customerId,
  });

  const renewals = renewalsData?.results || [];

  const createMutation = useMutation({
    mutationFn: (data: RenewalPayload) => createRenewal(data),
    onSuccess: () => {
      toast.success("Renewal created successfully.");
      queryClient.invalidateQueries({ queryKey: ['customerRenewals', customerId] });
      setIsFormOpen(false);
    },
    onError: (err: ApiError) => {
      const message = err.response?.data?.message || err.message || "Failed to create renewal";
      toast.error("Creation Failed", { description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<RenewalPayload>) => updateRenewal(selectedRenewal!.id, data),
    onSuccess: () => {
      toast.success("Renewal updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['customerRenewals', customerId] });
      setIsFormOpen(false);
    },
    onError: (err: ApiError) => {
      const message = err.response?.data?.message || err.message || "Failed to update renewal";
      toast.error("Update Failed", { description: message });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRenewal(id),
    onSuccess: () => {
      toast.success("Renewal deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['customerRenewals', customerId] });
      setIsDeleteConfirmOpen(false);
    },
    onError: (err: ApiError) => {
      const message = err.response?.data?.message || err.message || "Failed to delete renewal";
      toast.error("Deletion Failed", { description: message });
    },
  });

  const handleOpenCreate = () => {
    setSelectedRenewal(undefined);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (renewal: Renewal) => {
    setSelectedRenewal(renewal);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (renewal: Renewal) => {
    setSelectedRenewal(renewal);
    setIsDeleteConfirmOpen(true);
  };

  const handleFormSubmit = (data: RenewalPayload) => {
    if (selectedRenewal) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Renewal Reminder
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Renewal Date</TableHead>
              <TableHead>Policy Type</TableHead>
              <TableHead>Current Insurer</TableHead>
              {/* CHANGED: Replaced Estimated Premium with Notes */}
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : renewals.length > 0 ? (
              renewals.map(renewal => (
                <TableRow key={renewal.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <span>{format(new Date(renewal.renewal_date), "PP")}</span>
                      {differenceInDays(new Date(renewal.renewal_date), new Date()) <= 30 && 
                       isFuture(new Date(renewal.renewal_date)) && (
                        <Badge variant="destructive" className="ml-2">Due Soon</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{renewal.policy_type_description}</TableCell>
                  <TableCell>{renewal.current_insurer}</TableCell>
                  {/* CHANGED: Displaying Notes instead of Premium */}
                  <TableCell className="max-w-[250px] truncate" title={renewal.notes || ''}>
                    {renewal.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(renewal)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => handleOpenDelete(renewal)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No renewal reminders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRenewal ? 'Edit' : 'Create'} Renewal Reminder
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the renewal.
            </DialogDescription>
          </DialogHeader>
          <RenewalForm
            customerId={customerId}
            renewal={selectedRenewal}
            onSubmit={handleFormSubmit}
            isPending={createMutation.isPending || updateMutation.isPending}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this renewal reminder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90" 
              onClick={() => deleteMutation.mutate(selectedRenewal!.id)}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}