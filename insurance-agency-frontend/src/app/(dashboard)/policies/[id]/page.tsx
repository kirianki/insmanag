'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';

import api from '../../../../lib/api';
import { Policy, PolicyInstallment, InstallmentPaymentRequest } from '../../../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { Button } from '../../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../../../components/ui/dialog';
// NEW: Installment payment form and columns
import { InstallmentPaymentForm, InstallmentPaymentFormValues } from '../../../../components/features/policies/installments-payment-form'; 
import { DataTable } from '../../../../components/shared/data-table';
import { getInstallmentColumns } from '../../../../components/features/policies/installments-columns';
import { PolicyActivationForm } from '../../../../components/features/policies/policy-activation-form';
import { PolicyActivationFormValues } from '../../../../components/features/policies/policy-activation-form-schema';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../lib/utils';


// API Functions
const fetchPolicyById = async (id: string): Promise<Policy> => api.get(`/policies/${id}/`).then(res => res.data);
const activatePolicy = async ({ id, insurance_certificate_number }: { id: string; insurance_certificate_number: string }) => {
  return api.post(`/policies/${id}/activate/`, { insurance_certificate_number }).then(res => res.data);
};
// NEW: API function for recording an installment payment
const payInstallment = async ({ policyId, installmentId, paymentData }: { policyId: string; installmentId: string; paymentData: InstallmentPaymentRequest }) => {
    return api.post(`/policies/${policyId}/installments/${installmentId}/pay/`, paymentData).then(res => res.data);
}


export default function PolicyDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const policyId = params.id as string;

  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<PolicyInstallment | null>(null);

  const { data: policy, isLoading, error, refetch } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => fetchPolicyById(policyId),
    enabled: !!policyId,
  });

  const activationMutation = useMutation({
    mutationFn: activatePolicy,
    onSuccess: () => {
      alert('Policy activated successfully!');
      setIsActivateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
    onError: (error: any) => alert(`Failed to activate policy: ${error.response?.data?.detail || error.message}`),
  });

  // NEW: Mutation for paying an installment
  const paymentMutation = useMutation({
    mutationFn: payInstallment,
    onSuccess: () => {
        alert('Payment recorded successfully!');
        setSelectedInstallment(null); // Close the dialog
        refetch(); // Refetch policy details to show updated installment status
    },
    onError: (error: any) => alert(`Failed to record payment: ${error.response?.data?.detail || error.message}`),
  });


  const handleActivatePolicy = (values: PolicyActivationFormValues) => {
    activationMutation.mutate({ id: policyId, ...values });
  };
  
  // NEW: Handler for submitting the payment form
  const handleRecordPayment = (values: InstallmentPaymentFormValues) => {
      if (!selectedInstallment) return;
      paymentMutation.mutate({
          policyId,
          installmentId: selectedInstallment.id,
          paymentData: {
              ...values,
              paid_on: format(values.paid_on, 'yyyy-MM-dd')
          }
      });
  }

  // NEW: Dynamically generate columns with the payment handler
  const installmentColumns = getInstallmentColumns(setSelectedInstallment);

  if (isLoading) return <div className="p-4">Loading policy details...</div>;
  if (error) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load policy.</AlertDescription></Alert>;
  if (!policy) return <div>Policy not found.</div>;

  const canBeActivated = policy.status === 'PAID_PENDING_ACTIVATION';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Policy #{policy.policy_number}</h1>
          <p className="text-muted-foreground">
            {/* FIX: Use nested customer_detail object */}
            For customer: <Link href={`/customers/${policy.customer_detail.id}`} className="text-blue-600 hover:underline">{policy.customer_detail.name}</Link>
          </p>
        </div>
        <Badge className={cn("text-lg", {
            'bg-green-600 text-white': policy.status === 'ACTIVE',
            'bg-teal-500 text-white': policy.status === 'ACTIVE_INSTALLMENT', // NEW
            'bg-yellow-500 text-white': policy.status === 'AWAITING_PAYMENT',
            'bg-blue-500 text-white': policy.status === 'PAID_PENDING_ACTIVATION',
            'bg-red-600 text-white': policy.status === 'EXPIRED' || policy.status === 'CANCELLED',
            'bg-orange-500 text-white': policy.status === 'LAPSED',
        })}>{policy.status_display}</Badge>
      </div>

      {canBeActivated && ( /* ... Activation Card remains the same */ )}

      <Card>
        <CardHeader>
          <CardTitle>Policy Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-semibold text-gray-500">Insurance Provider</p>
              {/* FIX: Use nested provider_detail object */}
              <p>{policy.provider_detail.name}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Policy Type</p>
              {/* FIX: Use nested policy_type_detail object */}
              <p>{policy.policy_type_detail.name}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Premium</p>
              {/* FIX: Use total_premium_amount */}
              <p>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(parseFloat(policy.total_premium_amount))}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Coverage Start Date</p>
              <p>{new Date(policy.policy_start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500">Coverage End Date</p>
              <p>{new Date(policy.policy_end_date).toLocaleDateString()}</p>
            </div>
            {policy.vehicle_registration_number && (
              <div>
                <p className="font-semibold text-gray-500">Vehicle Registration</p>
                <p className="font-mono">{policy.vehicle_registration_number}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- NEW: Installment Details Card --- */}
      {policy.is_installment && (
        <Card>
          <CardHeader><CardTitle>Installment Plan</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={installmentColumns} data={policy.installments} />
          </CardContent>
        </Card>
      )}

      {/* --- NEW: Dialog for Recording Payment --- */}
      <Dialog open={!!selectedInstallment} onOpenChange={(isOpen) => !isOpen && setSelectedInstallment(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Record Payment for Installment</DialogTitle>
                <DialogDescription>
                    Due on {selectedInstallment && new Date(selectedInstallment.due_date).toLocaleDateString()} for {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES' }).format(parseFloat(selectedInstallment?.amount || '0'))}
                </DialogDescription>
            </DialogHeader>
            <InstallmentPaymentForm
                onSubmit={handleRecordPayment}
                isPending={paymentMutation.isPending}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
}