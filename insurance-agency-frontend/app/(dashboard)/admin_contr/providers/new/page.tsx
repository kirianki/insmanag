'use client';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInsuranceProvider } from '@/services/utilityService';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ProviderForm, ProviderFormData } from '../components/ProviderForm';

export default function NewProviderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: createInsuranceProvider,
    onSuccess: (data) => {
      toast.success("Provider Created", {
        description: `Successfully created ${data.data.name}.`
      });
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      // Redirect to the new provider's detail page
      router.push(`/admin_contrl/providers/${data.data.id}`);
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error("Creation Failed", { description: error.message });
      } else {
        toast.error("Creation Failed", { description: "An unexpected error occurred." });
      }
    }
  });

  const handleSubmit = (data: ProviderFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add New Insurance Provider" />
      <Card>
        <CardContent className="pt-6">
          <ProviderForm 
            onSubmit={handleSubmit} 
            isPending={mutation.isPending} 
            submitButtonText="Create Provider"
          />
        </CardContent>
      </Card>
    </div>
  );
}