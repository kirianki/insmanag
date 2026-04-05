'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnpaidItems, simulatePayment } from '@/services/policyService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks';
import { SearchableCombobox } from '@/components/shared/SearchableCombobox';
import { useDebounce } from 'use-debounce';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { UnpaidItem } from '@/types/api';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      message?: string;
    };
  };
  message?: string;
}

// Define possible response structures
interface UnpaidItemsResponse {
  items?: UnpaidItem[];
  results?: UnpaidItem[];
}

export function PaymentSimulationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedItem, setSelectedItem] = useState<UnpaidItem | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  const { data: unpaidItemsResponse, isLoading } = useQuery({
    queryKey: ['unpaidItems', { search: debouncedSearch }],
    queryFn: () => getUnpaidItems({ search: debouncedSearch }).then(res => res.data),
  });

  // Extract the array from the response - adjust based on your API structure
  const unpaidItems: UnpaidItem[] = Array.isArray(unpaidItemsResponse) 
    ? unpaidItemsResponse 
    : (unpaidItemsResponse as UnpaidItemsResponse | undefined)?.items || 
      (unpaidItemsResponse as UnpaidItemsResponse | undefined)?.results || 
      [];

  const mutation = useMutation({
    mutationFn: (item: { item_id: string; item_type: 'POLICY' | 'INSTALLMENT' }) => simulatePayment(item),
    onSuccess: (response) => {
      toast.success("Simulation Successful", { description: response.data.message });
      queryClient.invalidateQueries({ queryKey: ['unpaidItems'] });
      setSelectedItem(null);
      setSearch('');
    },
    onError: (err: ApiError) => {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || "An unexpected error occurred.";
      toast.error("Simulation Failed", { description: errorMsg });
    },
  });

  const handleSimulateClick = () => {
    if (selectedItem) {
      mutation.mutate({
        item_id: selectedItem.item_id,
        item_type: selectedItem.item_type,
      });
    }
  };

  const options = unpaidItems.map(item => ({
    value: item.item_id,
    label: `Policy #${item.policy_number} - ${item.customer_name} (${item.item_type === 'POLICY' ? 'Full Premium' : 'Installment'}) - $${item.amount_due}`
  }));

  const mutationError = mutation.error as ApiError | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Simulation</CardTitle>
        <CardDescription>
          Select an unpaid item (full policy or installment) to simulate a payment. This will mark the item as paid and trigger any relevant backend processes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="grid gap-1.5 flex-1 w-full">
            <SearchableCombobox 
              options={options}
              value={selectedItem?.item_id || ''}
              onSelect={(itemId) => {
                const item = unpaidItems.find(i => i.item_id === itemId);
                setSelectedItem(item || null);
              }}
              onSearchChange={setSearch}
              isLoading={isLoading}
              placeholder="Search for an unpaid item..."
              searchPlaceholder="Search by policy number or customer..."
            />
          </div>
          <Button onClick={handleSimulateClick} disabled={!selectedItem || mutation.isPending}>
            {mutation.isPending ? "Simulating..." : "Run Simulation"}
          </Button>
        </div>

        {/* Unpaid Items Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading unpaid items...</div>
        ) : unpaidItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unpaidItems.map((item) => (
              <Card 
                key={item.item_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedItem?.item_id === item.item_id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Policy #{item.policy_number}</CardTitle>
                  <CardDescription>{item.customer_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium">
                      {item.item_type === 'POLICY' ? 'Full Premium' : 'Installment'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount Due:</span>
                    <span className="text-lg font-bold text-primary">${item.amount_due}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No unpaid items match your search.' : 'No unpaid items found.'}
          </div>
        )}
        
        {mutation.isSuccess && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Simulation Succeeded</AlertTitle>
            <AlertDescription>{mutation.data.data.message}</AlertDescription>
          </Alert>
        )}
        {mutation.isError && mutationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Simulation Failed</AlertTitle>
            <AlertDescription>
              {mutationError.response?.data?.detail || mutationError.response?.data?.message || mutationError.message || "An error occurred"}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}