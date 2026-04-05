"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Expense, ExpenseCategory } from "@/types/finance";

interface EditExpenseDialogProps {
    expense: Expense | null;
    categories: ExpenseCategory[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditExpenseDialog({ expense, categories, open, onOpenChange }: EditExpenseDialogProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        date_incurred: "",
        description: "",
        frequency: "ONE_TIME",
    });

    useEffect(() => {
        if (expense) {
            setFormData({
                category: expense.category,
                amount: expense.amount.toString(),
                date_incurred: expense.date_incurred,
                description: expense.description || "",
                frequency: expense.frequency,
            });
        }
    }, [expense]);

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Expense>) => financeService.updateExpense(expense!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            onOpenChange(false);
            toast.success("Expense updated successfully");
        },
        onError: () => {
            toast.error("Failed to update expense");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (!expense) return null;

    const isPastDate = new Date(expense.date_incurred) < new Date(new Date().setHours(0, 0, 0, 0));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {expense.is_recurring && isPastDate && (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                            <strong>Note:</strong> This is a past recurring expense. Updating it will preserve this record as is and create a <strong>new recurring record</strong> for the next period.
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="edit-category">Category</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-amount">Amount</Label>
                        <Input
                            id="edit-amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-date">Date Incurred</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={formData.date_incurred}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date_incurred: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-frequency">Frequency</Label>
                        <Select
                            value={formData.frequency}
                            onValueChange={(val) => setFormData({ ...formData, frequency: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ONE_TIME">One Time</SelectItem>
                                <SelectItem value="WEEKLY">Weekly</SelectItem>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                <SelectItem value="ANNUALLY">Annually</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Input
                            id="edit-description"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
