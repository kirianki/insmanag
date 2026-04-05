"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExpenseCategory } from "@/types/finance";

interface ManageCategoriesDialogProps {
    categories: ExpenseCategory[];
}

export function ManageCategoriesDialog({ categories }: ManageCategoriesDialogProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const createMutation = useMutation({
        mutationFn: financeService.createExpenseCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
            setNewCategoryName("");
            toast.success("Category created");
        },
        onError: () => {
            toast.error("Failed to create category");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => financeService.updateExpenseCategory(id, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
            setEditingId(null);
            toast.success("Category updated");
        },
        onError: () => {
            toast.error("Failed to update category");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteExpenseCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
            toast.success("Category deleted");
        },
        onError: () => {
            toast.error("Cannot delete category (it may be in use)");
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        createMutation.mutate({ name: newCategoryName });
    };

    const startEditing = (cat: ExpenseCategory) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const handleUpdate = () => {
        if (!editingId || !editName.trim()) return;
        updateMutation.mutate({ id: editingId, name: editName });
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this category?")) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <form onSubmit={handleCreate} className="flex gap-2 items-end">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="new-category">New Category Name</Label>
                            <Input
                                id="new-category"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g. Office Supplies"
                            />
                        </div>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Adding..." : "Add"}
                        </Button>
                    </form>

                    <div className="border rounded-md max-h-[300px] overflow-y-auto p-2 space-y-2">
                        {categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No categories found.</p>
                        ) : (
                            categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md text-sm">
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2 flex-1 mr-2">
                                            <Input
                                                size={1}
                                                className="h-8"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                autoFocus
                                            />
                                            <Button size="sm" className="h-8" onClick={handleUpdate} disabled={updateMutation.isPending}>
                                                Save
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span>{cat.name}</span>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => startEditing(cat)}
                                                >
                                                    ✎
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
