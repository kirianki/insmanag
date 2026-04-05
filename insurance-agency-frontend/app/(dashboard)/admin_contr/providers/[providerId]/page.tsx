'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsuranceProviderById, updateInsuranceProvider } from '@/services/utilityService';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderHeader } from './components/ProviderHeader';
import { CommissionStructuresTab } from './components/CommissionsStructuresTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProviderForm, ProviderFormData } from '../components/ProviderForm';
import { useToast } from '@/lib/hooks';

interface Provider {
  name: string;
  short_name?: string;
  registration_number?: string;
  is_active?: boolean;
  email?: string;
  phone_number?: string;
  website?: string;
  country?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  claims_email?: string;
  claims_phone?: string;
  notes?: string;
}

// A comprehensive details component.
function ProviderDetails({ provider, isLoading }: { provider: Provider | undefined, isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        )
    }

    if (!provider) {
        return <p>No provider data available.</p>;
    }

    const detailItems = [
        { label: 'Full Name', value: provider.name },
        { label: 'Short Name', value: provider.short_name },
        { label: 'Registration #', value: provider.registration_number },
        { label: 'Status', value: provider.is_active ? 'Active' : 'Inactive' },
        { label: 'Email', value: provider.email },
        { label: 'Phone', value: provider.phone_number },
        { label: 'Website', value: provider.website },
        { label: 'Country', value: provider.country },
        { label: 'Contact Person Name', value: provider.contact_person_name },
        { label: 'Contact Person Email', value: provider.contact_person_email },
        { label: 'Claims Email', value: provider.claims_email },
        { label: 'Claims Phone', value: provider.claims_phone },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {detailItems.map(item => (
                <div key={item.label}>
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className="text-sm">{item.value || 'Not Provided'}</p>
                </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3">
                 <p className="text-sm font-medium text-muted-foreground">Internal Notes</p>
                 <p className="text-sm whitespace-pre-wrap">{provider.notes || 'No notes added.'}</p>
            </div>
        </div>
    );
}

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const providerId = params.providerId as string;
  const [isEditOpen, setEditOpen] = useState(false);

  const providerQuery = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => getInsuranceProviderById(providerId).then(res => res.data),
    enabled: !!providerId,
  });
  
  const provider = providerQuery.data;
  const isLoading = providerQuery.isLoading;

  const mutation = useMutation({
    mutationFn: (formData: ProviderFormData) => updateInsuranceProvider(providerId, formData),
    onSuccess: (updatedData) => {
      toast.success("Provider Updated", { description: `${updatedData.data.name} has been updated.` });
      queryClient.setQueryData(['provider', providerId], updatedData.data);
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setEditOpen(false);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error("Update Failed", { description: error.message });
      } else {
        toast.error("Update Failed", { description: "An unexpected error occurred." });
      }
    },
  });

  const handleEditSubmit = (data: ProviderFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Agency Settings
      </Button>

      <ProviderHeader 
        provider={provider} 
        isLoading={isLoading} 
        onEdit={() => setEditOpen(true)}
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="commissions">Commission Structures</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Provider Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProviderDetails provider={provider} isLoading={isLoading} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="commissions" className="mt-4">
          <CommissionStructuresTab providerId={providerId} />
        </TabsContent>
      </Tabs>
      
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Provider: {provider?.name}</DialogTitle>
            <DialogDescription>Make changes to the provider details below. Click save when you&apos;re done.</DialogDescription>
          </DialogHeader>
          <ProviderForm 
            initialData={provider}
            onSubmit={handleEditSubmit}
            isPending={mutation.isPending}
            submitButtonText="Save Changes"
          />
        </DialogContent>
      </Dialog> 
    </div>
  );
}