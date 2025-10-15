'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, User as UserIcon, Edit } from 'lucide-react';

import api from '../../../../lib/api';
import { Customer, Policy, Claim, CustomerDocument, Renewal } from '../../../../types';
import { useAuth } from '../../../../hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../../../components/ui/alert';
import { DataTable } from '../../../../components/shared/data-table';
import { policyColumns } from '../../../../components/features/policies/columns';
import { claimColumns } from '../../../../components/features/claims/columns';
import { documentColumns } from '../../../../components/features/customer-documents/columns';
import { renewalColumns } from '../../../../components/features/renewals/columns';
import { DocumentUploadForm } from '../../../../components/features/customer-documents/document-upload-form';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '../../../../components/ui/dialog';
import { PolicyForm } from '../../../../components/features/policies/policy-form';
import { PolicyFormValues } from '../../../../components/features/policies/policy-form-schema';
import { CustomerForm } from '../../../../components/features/customers/customer-form';
import { CustomerFormValues } from '../../../../components/features/customers/customer-form-schema';
import { RenewalForm, RenewalFormValues } from '../../../../components/features/renewals/renewal-form';

// API fetching functions
const fetchCustomerById = async (id: string): Promise<Customer> => api.get(`/customers/${id}/`).then(res => res.data);
const fetchPoliciesByCustomerId = async (id: string): Promise<{ results: Policy[] }> => api.get(`/policies/?customer__id=${id}`).then(res => res.data);
const fetchClaimsByCustomerId = async (id: string): Promise<{ results: Claim[] }> => api.get(`/claims/?claimant__id=${id}`).then(res => res.data);
const fetchRenewalsByCustomerId = async (id: string): Promise<{ results: Renewal[] }> => api.get(`/renewals/?customer__id=${id}`).then(res => res.data);

// --- FIX: Updated the URL for fetching documents to use the nested route ---
const fetchDocumentsByCustomerId = async (id: string): Promise<{ results: CustomerDocument[] }> => 
  api.get(`/customers/${id}/documents/`).then(res => res.data);

// --- FIX: Updated the URL and signature for uploading documents ---
const uploadDocument = async ({ customerId, formData }: { customerId: string, formData: FormData }) => {
  return api.post(`/customers/${customerId}/documents/`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }).then(res => res.data);
};

const createPolicy = async (policyData: PolicyFormValues & { customer: string; agent: string }) => {
  return api.post('/policies/', policyData).then(res => res.data);
};
const updateCustomer = async ({ id, ...customerData }: Partial<CustomerFormValues> & { id: string }) => {
  return api.patch(`/customers/${id}/`, customerData).then(res => res.data);
};
const createRenewal = async (renewalData: RenewalFormValues & { customer: string }) => {
  return api.post('/renewals/', renewalData).then(res => res.data);
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const customerId = params.id as string;

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isEditCustomerDialogOpen, setIsEditCustomerDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);

  // Queries
  const { data: customer, isLoading: isCustomerLoading, error: customerError } = useQuery({ queryKey: ['customer', customerId], queryFn: () => fetchCustomerById(customerId), enabled: !!customerId });
  const { data: policiesData } = useQuery({ queryKey: ['policies', customerId], queryFn: () => fetchPoliciesByCustomerId(customerId), enabled: !!customerId });
  const { data: claimsData } = useQuery({ queryKey: ['claims', customerId], queryFn: () => fetchClaimsByCustomerId(customerId), enabled: !!customerId });
  const { data: documentsData } = useQuery({ queryKey: ['documents', customerId], queryFn: () => fetchDocumentsByCustomerId(customerId), enabled: !!customerId });
  const { data: renewalsData } = useQuery({ queryKey: ['renewals', customerId], queryFn: () => fetchRenewalsByCustomerId(customerId), enabled: !!customerId });

  // Mutations
  const documentMutation = useMutation({
    // --- FIX: Pass an object to the new uploadDocument function ---
    mutationFn: (formData: FormData) => uploadDocument({ customerId, formData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', customerId] });
      setIsUploadDialogOpen(false);
      alert('Document uploaded successfully!');
    },
    onError: (error) => alert(`Failed to upload document: ${error.message}`),
  });

  const policyMutation = useMutation({
    mutationFn: (values: PolicyFormValues) => {
      if (!user?.id) throw new Error("Agent could not be identified.");
      return createPolicy({ ...values, customer: customerId, agent: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies', customerId] });
      setIsPolicyDialogOpen(false);
      alert('Policy created successfully!');
    },
    onError: (error) => alert(`Failed to create policy: ${error.message}`),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditCustomerDialogOpen(false);
      alert('Customer updated successfully!');
    },
    onError: (error) => alert(`Failed to update customer: ${error.message}`),
  });

  const renewalMutation = useMutation({
    mutationFn: (values: RenewalFormValues) => createRenewal({ ...values, customer: customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals', customerId] });
      setIsRenewalDialogOpen(false);
      alert('Renewal logged successfully!');
    },
    onError: (error) => alert(`Failed to log renewal: ${error.message}`),
  });

  const handleUpdateCustomer = (values: CustomerFormValues) => {
    updateCustomerMutation.mutate({ ...values, id: customerId });
  };

  if (isCustomerLoading) return <div className="p-4">Loading customer details...</div>;
  if (customerError) return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load customer details.</AlertDescription></Alert>;
  if (!customer) return <div>Customer not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{customer.first_name} {customer.last_name}</h1>
            <p className="text-muted-foreground">Customer ID: {customer.customer_number}</p>
          </div>
          <Dialog open={isEditCustomerDialogOpen} onOpenChange={setIsEditCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>
                  Update the details for {customer.first_name} {customer.last_name}.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm
                onSubmit={handleUpdateCustomer}
                isPending={updateCustomerMutation.isPending}
                defaultValues={customer}
              />
            </DialogContent>
          </Dialog>
        </div>
        <Card className="w-full md:w-auto md:min-w-[300px]">
          <CardContent className="pt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{customer.email || 'No email'}</span></div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{customer.phone}</span></div>
            <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" /><span>KYC Status: <span className="font-semibold">{customer.kyc_status}</span></span></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="policies">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Insurance Policies</CardTitle>
              <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                <DialogTrigger asChild><Button>Create Policy</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Policy</DialogTitle>
                    <DialogDescription>For customer: {customer.first_name} {customer.last_name}</DialogDescription>
                  </DialogHeader>
                  <PolicyForm onSubmit={policyMutation.mutate} isPending={policyMutation.isPending} defaultCustomerId={customerId} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable columns={policyColumns} data={policiesData?.results || []} onRowClick={(policy) => router.push(`/policies/${policy.id}`)} filterColumnId="policy_number" filterPlaceholder="Filter by policy #..." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader><CardTitle>Claim History</CardTitle></CardHeader>
            <CardContent>
              <DataTable
                columns={claimColumns}
                data={claimsData?.results || []}
                filterColumnId="claim_number"
                filterPlaceholder="Filter by claim #..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Documents</CardTitle>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild><Button>Upload Document</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload a New Document</DialogTitle>
                    <DialogDescription>Select a document type and file to upload for this customer.</DialogDescription>
                  </DialogHeader>
                  <DocumentUploadForm onSubmit={documentMutation.mutate} isPending={documentMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable columns={documentColumns} data={documentsData?.results || []} filterColumnId="document_type" filterPlaceholder="Filter by document type..." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Policy Renewals</CardTitle>
              <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
                <DialogTrigger asChild><Button>Log Renewal</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log a New Renewal</DialogTitle>
                    <DialogDescription>
                      Log an upcoming renewal for {customer.first_name} {customer.last_name}.
                    </DialogDescription>
                  </DialogHeader>
                  <RenewalForm onSubmit={renewalMutation.mutate} isPending={renewalMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={renewalColumns}
                data={renewalsData?.results || []}
                filterColumnId="policy_type_description"
                filterPlaceholder="Filter by policy type..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}