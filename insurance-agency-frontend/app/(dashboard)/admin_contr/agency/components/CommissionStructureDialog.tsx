'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProviderCommissionStructures, createProviderCommissionStructure, deleteProviderCommissionStructure } from "@/services/commissionService";
import { getPolicyTypes } from "@/services/policyService";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/hooks";
import { ProviderCommissionStructure } from "@/types/api"; // Assuming ProviderCommissionStructure type is defined here

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

export function CommissionStructuresTab({ providerId }: { providerId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Form state for adding a new structure
    const [policyTypeId, setPolicyTypeId] = useState<string>('');
    const [commissionType, setCommissionType] = useState<'NEW_BUSINESS' | 'RENEWAL'>('NEW_BUSINESS'); // Explicitly type
    const [rate, setRate] = useState<string>('');

    // Get the agencyId from the correct property on the user object.
    const agencyId = user?.agency_detail?.id;

    // A new handler for the commission type select to resolve the type error.
    const handleCommissionTypeChange = (value: string) => {
        setCommissionType(value as 'NEW_BUSINESS' | 'RENEWAL');
    };

    // Query 1: Fetch all available policy types for the agency first.
    const { data: policyTypesData, isLoading: isLoadingPolicyTypes } = useQuery({
        queryKey: ['policyTypes', agencyId],
        queryFn: () => getPolicyTypes(agencyId!).then(res => res.data),
        enabled: !!agencyId,
    });

    // Query 2: Fetch existing commission structures for this provider.
    const { data: structuresData, isLoading: isLoadingStructures } = useQuery({
        queryKey: ['providerCommission', providerId],
        queryFn: () => getProviderCommissionStructures({ provider: providerId }).then(res => res.data),
        enabled: !!providerId && !!policyTypesData,
    });

    // A combined loading state for the main table.
    const isLoading = isLoadingPolicyTypes || isLoadingStructures;

    const createMutation = useMutation({
        mutationFn: (newData: Omit<ProviderCommissionStructure, "id">) => createProviderCommissionStructure(newData),
        onSuccess: () => {
            toast.success("Commission structure added successfully.");
            queryClient.invalidateQueries({ queryKey: ['providerCommission', providerId] });
            // Reset form fields
            setPolicyTypeId('');
            setCommissionType('NEW_BUSINESS');
            setRate('');
        },
        onError: (error: unknown) => {
            const message = error && typeof error === 'object' && 'message' in error
                ? String(error.message)
                : 'An error occurred';
            toast.error("Failed to add structure", { description: message });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteProviderCommissionStructure(id),
        onSuccess: () => {
            toast.success("Structure deleted.");
            queryClient.invalidateQueries({ queryKey: ['providerCommission', providerId] });
        },
        onError: (error: unknown) => {
            const message = error && typeof error === 'object' && 'message' in error
                ? String(error.message)
                : 'An error occurred';
            toast.error("Delete failed", { description: message });
        },
    });

    const handleAddStructure = () => {
        if (!policyTypeId || !rate || !commissionType) {
            toast.error("All fields are required to add a new structure.");
            return;
        }

        // Ensure rate is a valid number before sending
        const parsedRate = parseFloat(rate);
        if (isNaN(parsedRate)) {
            toast.error("Rate must be a valid number.");
            return;
        }

        createMutation.mutate({
            provider: providerId, // providerId is guaranteed to be a string
            policy_type: policyTypeId,
            commission_type: commissionType, // This is already typed as 'NEW_BUSINESS' | 'RENEWAL'
            rate_percentage: parsedRate.toString(), // Assuming API expects string, convert back if needed, or adjust type
        });
    };

    const getPolicyTypeName = (id: string) => {
        return policyTypesData?.results.find(pt => pt.id === id)?.name || 'Unknown';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Commission Structures</CardTitle>
                <CardDescription>Define the commission rates this provider pays for different policy types.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Policy Type</TableHead>
                            <TableHead>Commission Type</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>
                        ))}
                        {!isLoading && structuresData?.results.map(structure => (
                            <TableRow key={structure.id}>
                                <TableCell className="font-medium">{getPolicyTypeName(structure.policy_type)}</TableCell>
                                <TableCell>{structure.commission_type}</TableCell>
                                <TableCell>{structure.rate_percentage}%</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(structure.id)} disabled={deleteMutation.isPending}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && (!structuresData || structuresData.results.length === 0) && (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center">No commission structures defined for this provider.</TableCell></TableRow>
                         )}
                    </TableBody>
                </Table>

                <div className="mt-6 border-t pt-6">
                    <h4 className="text-md font-semibold mb-4">Add New Structure</h4>
                    <div className="flex flex-col sm:flex-row gap-4 items-end p-4 border rounded-lg bg-secondary">
                        <div className="grid gap-1.5 flex-1 w-full">
                            <Label>Policy Type</Label>
                            {isLoadingPolicyTypes ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={policyTypeId} onValueChange={setPolicyTypeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a policy type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {policyTypesData?.results.map(pt => (
                                            <SelectItem key={pt.id} value={pt.id}>
                                                {pt.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="grid gap-1.5 flex-1 w-full">
                            <Label>Commission Type</Label>
                            <Select value={commissionType} onValueChange={handleCommissionTypeChange}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                                    <SelectItem value="RENEWAL">Renewal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5 w-full sm:w-auto">
                            <Label>Rate (%)</Label>
                            <Input type="number" placeholder="e.g., 15.5" value={rate} onChange={e => setRate(e.target.value)} />
                        </div>
                        <Button onClick={handleAddStructure} disabled={createMutation.isPending || isLoadingPolicyTypes} className="w-full sm:w-auto">
                            {createMutation.isPending ? "Adding..." : "Add Rate"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}