"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DeductionType, PaginatedResponse } from "@/types/finance";
import { Plus } from "lucide-react";

export function ManageDeductionTypes() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [newType, setNewType] = useState({ name: "", description: "" });

    const { data: types, isLoading } = useQuery<PaginatedResponse<DeductionType>>({
        queryKey: ["deduction-types"],
        queryFn: financeService.getDeductionTypes,
        enabled: isOpen,
    });

    const createMutation = useMutation({
        mutationFn: financeService.createDeductionType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deduction-types"] });
            setNewType({ name: "", description: "" });
            toast.success("Deduction type created");
        },
        onError: () => {
            toast.error("Failed to create deduction type");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newType);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Manage Deduction Types</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Deduction Types</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex gap-4 items-end mb-4">
                    <div className="grid gap-2 flex-1">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={newType.name}
                            onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                            placeholder="e.g. Welfare, Tax"
                            required
                        />
                    </div>
                    <div className="grid gap-2 flex-[2]">
                        <Label htmlFor="desc">Description</Label>
                        <Input
                            id="desc"
                            value={newType.description}
                            onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                            placeholder="Optional description"
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
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                            ) : types?.results?.length === 0 ? (
                                <TableRow><TableCell colSpan={2}>No deduction types found.</TableCell></TableRow>
                            ) : (
                                types?.results?.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">{t.name}</TableCell>
                                        <TableCell>{t.description}</TableCell>
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
