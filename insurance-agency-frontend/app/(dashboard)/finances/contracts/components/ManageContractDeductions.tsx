"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ContractDeduction, DeductionType, PaginatedResponse } from "@/types/finance";
import { Plus, Trash2 } from "lucide-react";

interface ManageContractDeductionsProps {
    contractId: string | null;
    userEmail: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ManageContractDeductions({ contractId, userEmail, isOpen, onClose }: ManageContractDeductionsProps) {
    const queryClient = useQueryClient();
    const [newDeduction, setNewDeduction] = useState({
        deduction_type: "",
        amount_type: "FIXED",
        amount: "",
    });

    const { data: deductions, isLoading } = useQuery<PaginatedResponse<ContractDeduction>>({
        queryKey: ["contract-deductions", contractId],
        queryFn: () => financeService.getContractDeductions({ contract: contractId! }),
        enabled: !!contractId && isOpen,
    });

    const { data: types } = useQuery<PaginatedResponse<DeductionType>>({
        queryKey: ["deduction-types"],
        queryFn: financeService.getDeductionTypes,
        enabled: isOpen,
    });

    const createMutation = useMutation({
        mutationFn: financeService.createContractDeduction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contract-deductions", contractId] });
            setNewDeduction({ deduction_type: "", amount_type: "FIXED", amount: "" });
            toast.success("Deduction added");
        },
        onError: () => {
            toast.error("Failed to add deduction");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteContractDeduction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contract-deductions", contractId] });
            toast.success("Deduction removed");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractId) return;
        createMutation.mutate({
            ...newDeduction,
            contract: contractId,
            is_active: true
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Manage Deductions for {userEmail}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end mb-4 bg-muted/50 p-4 rounded-md">
                    <div className="grid gap-2 min-w-[200px]">
                        <Label htmlFor="dtype">Deduction Type</Label>
                        <Select
                            value={newDeduction.deduction_type}
                            onValueChange={(val) => setNewDeduction({ ...newDeduction, deduction_type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {types?.results?.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 min-w-[150px]">
                        <Label htmlFor="atype">Amount Type</Label>
                        <Select
                            value={newDeduction.amount_type}
                            onValueChange={(val) => setNewDeduction({ ...newDeduction, amount_type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                <SelectItem value="PERCENTAGE_OF_BASE">% of Base Salary</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 w-[120px]">
                        <Label htmlFor="amount">Value</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={newDeduction.amount}
                            onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <Button type="submit" disabled={createMutation.isPending}>
                        <Plus className="h-4 w-4 mr-2" /> Add
                    </Button>
                </form>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Calculation</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                            ) : deductions?.results?.length === 0 ? (
                                <TableRow><TableCell colSpan={4}>No active deductions.</TableCell></TableRow>
                            ) : (
                                deductions?.results?.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="font-medium">{d.deduction_type_name}</TableCell>
                                        <TableCell>
                                            {d.amount_type === 'FIXED' ? 'Fixed Amount' : '% of Base Salary'}
                                        </TableCell>
                                        <TableCell>
                                            {d.amount_type === 'FIXED' ? `KES ${Number(d.amount).toLocaleString()}` : `${d.amount}%`}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteMutation.mutate(d.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
