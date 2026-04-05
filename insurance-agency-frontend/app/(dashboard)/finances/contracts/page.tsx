"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ManageDeductionTypes } from "./components/ManageDeductionTypes";
import { ManageContractDeductions } from "./components/ManageContractDeductions";
import { Settings } from "lucide-react";
import { StaffContract, PaginatedResponse, UserBasic } from "@/types/finance";


export default function ContractsPage() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<{ id: string, email: string } | null>(null);
    const [newContract, setNewContract] = useState({
        user: "",
        base_salary: "",
        start_date: "",
        tax_pin: "",
    });

    const { data: contracts, isLoading } = useQuery<PaginatedResponse<StaffContract>>({
        queryKey: ["staff-contracts"],
        queryFn: () => financeService.getStaffContracts(),
    });

    const { data: users } = useQuery<PaginatedResponse<UserBasic>>({
        queryKey: ["users"],
        queryFn: financeService.getUsers,
    });

    const createMutation = useMutation({
        mutationFn: financeService.createStaffContract,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-contracts"] });
            setIsAddOpen(false);
            toast.success("Contract created successfully");
        },
        onError: () => {
            toast.error("Failed to create contract. User might already have one.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newContract);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Staff Contracts</h1>
                    <p className="text-muted-foreground">Set base salaries and retainers for staff.</p>
                </div>
                <div className="flex gap-2">
                    <ManageDeductionTypes />
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button>+ New Contract</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Staff Contract</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="user">Staff Member</Label>
                                    <Select
                                        value={newContract.user}
                                        onValueChange={(val) => setNewContract({ ...newContract, user: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users?.results?.map((u: UserBasic) => (
                                                <SelectItem key={u.id} value={u.id}>{u.email} ({u.first_name} {u.last_name})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="salary">Base Salary / Retainer</Label>
                                    <Input
                                        id="salary"
                                        type="number"
                                        value={newContract.base_salary}
                                        onChange={(e) => setNewContract({ ...newContract, base_salary: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="start_date">Start Date</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={newContract.start_date}
                                        onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="tax_pin">Tax PIN (Optional)</Label>
                                    <Input
                                        id="tax_pin"
                                        value={newContract.tax_pin}
                                        onChange={(e) => setNewContract({ ...newContract, tax_pin: e.target.value })}
                                    />
                                </div>

                                <Button type="submit" disabled={createMutation.isPending}>
                                    Save Contract
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead className="text-right">Base Salary</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
                        ) : contracts?.results?.length === 0 ? (
                            <TableRow><TableCell colSpan={4}>No contracts found.</TableCell></TableRow>
                        ) : (
                            contracts?.results?.map((c: StaffContract) => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.user_email}</TableCell>
                                    <TableCell>{c.start_date}</TableCell>
                                    <TableCell className="text-right font-medium">KES {Number(c.base_salary).toLocaleString()}</TableCell>
                                    <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedContract({ id: c.id, email: c.user_email })}
                                        >
                                            <Settings className="h-4 w-4 mr-2" /> Deductions
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table >
            </div >

            <ManageContractDeductions
                contractId={selectedContract?.id || null}
                userEmail={selectedContract?.email || null}
                isOpen={!!selectedContract}
                onClose={() => setSelectedContract(null)}
            />
        </div>
    );
}
