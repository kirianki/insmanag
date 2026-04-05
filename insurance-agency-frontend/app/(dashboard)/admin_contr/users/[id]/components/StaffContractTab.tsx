'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { useToast } from "@/lib/hooks";
import { StaffContract } from "@/types/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ContractFormData {
    base_salary: string;
    start_date: string;
    tax_pin: string;
}

export function StaffContractTab({ userId }: { userId: string }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form state
    const [contractForm, setContractForm] = useState<ContractFormData>({
        base_salary: "",
        start_date: "",
        tax_pin: "",
    });

    const { data: contractsData, isLoading } = useQuery({
        queryKey: ['staffContracts', userId],
        queryFn: () => financeService.getStaffContracts({ user: userId }),
    });

    const createMutation = useMutation({
        mutationFn: (data: ContractFormData) => financeService.createStaffContract({ ...data, user: userId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staffContracts', userId] });
            setIsAddOpen(false);
            setContractForm({ base_salary: "", start_date: "", tax_pin: "" });
            toast.success("Contract created successfully");
        },
        onError: (error: unknown) => {
            const apiError = error as { response?: { data?: { detail?: string } } };
            const msg = apiError.response?.data?.detail || "Failed to create contract.";
            toast.error("Error", { description: msg });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(contractForm);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Staff Contract</CardTitle>
                    <CardDescription>Manage base salary and employment terms.</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Contract</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Contract</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="salary">Base Salary / Retainer (KES)</Label>
                                <Input
                                    id="salary"
                                    type="number"
                                    value={contractForm.base_salary}
                                    onChange={(e) => setContractForm({ ...contractForm, base_salary: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={contractForm.start_date}
                                    onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tax_pin">Tax PIN (Optional)</Label>
                                <Input
                                    id="tax_pin"
                                    value={contractForm.tax_pin}
                                    onChange={(e) => setContractForm({ ...contractForm, tax_pin: e.target.value })}
                                />
                            </div>
                            <Button type="submit" disabled={createMutation.isPending} className="w-full">
                                {createMutation.isPending ? "Saving..." : "Save Contract"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Base Salary</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tax PIN</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
                        {!isLoading && (!contractsData || contractsData.results.length === 0) && (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No contracts found for this user.</TableCell></TableRow>
                        )}
                        {!isLoading && contractsData?.results.map((contract: StaffContract) => (
                            <TableRow key={contract.id}>
                                <TableCell>{contract.start_date}</TableCell>
                                <TableCell>{contract.end_date || "Ongoing"}</TableCell>
                                <TableCell className="font-medium">KES {Number(contract.base_salary).toLocaleString()}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${contract.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {contract.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </TableCell>
                                <TableCell>{contract.tax_pin || "-"}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
