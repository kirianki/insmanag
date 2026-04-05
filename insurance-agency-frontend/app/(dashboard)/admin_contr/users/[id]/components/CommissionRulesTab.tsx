'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStaffCommissionRules, createStaffCommissionRule, deleteStaffCommissionRule } from "@/services/commissionService";
import { getPolicyTypes } from "@/services/policyService";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/hooks";
import { StaffCommissionRule } from "@/types/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

export function CommissionRulesTab({ userId }: { userId: string }) {
    const { user: authUser } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const agencyId = authUser?.agency_detail?.id;

    // Form state for adding a new rule
    const [policyTypeId, setPolicyTypeId] = useState<string>('all');
    const [payoutBasis, setPayoutBasis] = useState('AGENCY_COMMISSION');
    const [rate, setRate] = useState('');
    const [threshold, setThreshold] = useState('0');

    const { data: policyTypesData, isLoading: isLoadingPolicyTypes } = useQuery({
        queryKey: ['policyTypes', agencyId],
        queryFn: () => getPolicyTypes(agencyId!).then(res => res.data),
        enabled: !!agencyId,
    });

    const { data: rulesData, isLoading: isLoadingRules } = useQuery({
        queryKey: ['staffCommissionRules', userId],
        queryFn: () => getStaffCommissionRules({ user: userId }).then(res => res.data),
        enabled: !!userId && !isLoadingPolicyTypes,
    });

    const isLoading = isLoadingRules || isLoadingPolicyTypes;

    const createMutation = useMutation({
        mutationFn: (newData: Partial<StaffCommissionRule>) => createStaffCommissionRule(newData),
        onSuccess: () => {
            toast.success("Commission rule added successfully.");
            queryClient.invalidateQueries({ queryKey: ['staffCommissionRules', userId] });
            setPolicyTypeId('all');
            setPayoutBasis('AGENCY_COMMISSION');
            setRate('');
            setThreshold('0');
        },
        onError: (error: unknown) => {
            let errorMessage = "An unexpected error occurred.";
            if (error && typeof error === 'object' && 'response' in error) {
                const apiError = error as { response?: { data?: Record<string, unknown> }; message?: string };
                if (apiError.response?.data) {
                    const errorData = apiError.response.data;
                    const formattedErrors = Object.entries(errorData)
                        .map(([key, value]) => `${key}: ${(Array.isArray(value) ? value.join(', ') : String(value))}`)
                        .join(' | ');
                    errorMessage = formattedErrors || "Invalid data submitted.";
                } else if (apiError.message) {
                    errorMessage = apiError.message;
                }
            }
            toast.error("Failed to Add Rule", { description: errorMessage });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (ruleId: string) => deleteStaffCommissionRule(ruleId),
        onSuccess: () => {
            toast.success("Rule deleted.");
            queryClient.invalidateQueries({ queryKey: ['staffCommissionRules', userId] });
        },
        onError: (error: unknown) => {
            const message = error && typeof error === 'object' && 'message' in error
                ? String(error.message)
                : 'An error occurred';
            toast.error("Delete failed", { description: message });
        },
    });

    const handleAddRule = () => {
        if (!rate) {
            toast.error("Rate percentage is required.");
            return;
        }
        const payload: Partial<StaffCommissionRule> = {
            user: userId,
            policy_type: policyTypeId === 'all' ? undefined : policyTypeId,
            payout_basis: payoutBasis as 'AGENCY_COMMISSION' | 'TOTAL_PREMIUM',
            rate_percentage: rate,
            monthly_threshold: threshold,
        };
        createMutation.mutate(payload);
    };

    const getPolicyTypeName = (id: string | null | undefined) => {
        if (!id) return "All Policy Types";
        return policyTypesData?.results.find(pt => pt.id === id)?.name || "Unknown";
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Staff Commission Rules</CardTitle>
                <CardDescription>Define how this user earns commission on policies they sell.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applies To (Policy Type)</TableHead>
                            <TableHead>Basis</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Monthly Threshold</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 2 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ))}
                        {!isLoading && rulesData?.results.map(rule => (
                            <TableRow key={rule.id}>
                                <TableCell className="font-medium">{getPolicyTypeName(rule.policy_type)}</TableCell>
                                <TableCell>{rule.payout_basis.replace('_', ' ')}</TableCell>
                                <TableCell>{rule.rate_percentage}%</TableCell>
                                <TableCell>{Number(rule.monthly_threshold).toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(rule.id)} disabled={deleteMutation.isPending}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && (!rulesData || rulesData.results.length === 0) && (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center">No commission rules defined for this user.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t pt-6">
                <h4 className="font-semibold">Add New Rule</h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end w-full">
                    <div className="grid gap-1.5 flex-1 w-full">
                        <Label>Policy Type</Label>
                        {isLoadingPolicyTypes ? <Skeleton className="h-10 w-full" /> : (
                            <Select value={policyTypeId} onValueChange={setPolicyTypeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Policy Types (Default)</SelectItem>
                                    {policyTypesData?.results.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <div className="grid gap-1.5 flex-1 w-full">
                        <Label>Payout Basis</Label>
                        <Select value={payoutBasis} onValueChange={setPayoutBasis}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AGENCY_COMMISSION">Agency Commission</SelectItem>
                                <SelectItem value="TOTAL_PREMIUM">Total Premium</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <Label>Rate %</Label>
                        <Input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="0" />
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <Label>Monthly Threshold</Label>
                        <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="0" />
                    </div>
                    <Button onClick={handleAddRule} disabled={createMutation.isPending || isLoadingPolicyTypes} className="w-full sm:w-auto">
                        Add Rule
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}