"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, getYear, getMonth } from "date-fns";
import { toast } from "sonner";
import { Expense, ExpenseCategory, PaginatedResponse } from "@/types/finance";
import { ManageCategoriesDialog } from "./components/ManageCategoriesDialog";
import { PeriodFilter } from "@/components/finance/period-filter";

import { Trash2, Edit } from "lucide-react";
import { EditExpenseDialog } from "./components/EditExpenseDialog";

export default function ExpensesPage() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    // Filtering state
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");

    const [newExpense, setNewExpense] = useState({
        category: "",
        amount: "",
        date_incurred: format(new Date(), "yyyy-MM-dd"),
        description: "",
        frequency: "ONE_TIME",
    });

    const { data: expenses, isLoading: expensesLoading } = useQuery<PaginatedResponse<Expense>>({
        queryKey: ["expenses"],
        queryFn: financeService.getExpenses,
    });

    const { data: categories } = useQuery<PaginatedResponse<ExpenseCategory>>({
        queryKey: ["expense-categories"],
        queryFn: financeService.getExpenseCategories,
    });

    const createMutation = useMutation({
        mutationFn: financeService.createExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            setIsAddOpen(false);
            toast.success("Expense added successfully");
            setNewExpense({
                category: "",
                amount: "",
                date_incurred: format(new Date(), "yyyy-MM-dd"),
                description: "",
                frequency: "ONE_TIME",
            });
        },
        onError: () => {
            toast.error("Failed to add expense");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: financeService.deleteExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            toast.success("Expense deleted");
        },
        onError: () => {
            toast.error("Failed to delete expense");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newExpense);
    };

    const handleEdit = (expense: Expense) => {
        setSelectedExpense(expense);
        setIsEditOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this expense?")) {
            deleteMutation.mutate(id);
        }
    };

    // Filter logic
    const filteredExpenses = expenses?.results?.filter((exp: Expense) => {
        const date = parseISO(exp.date_incurred);
        if (getYear(date) !== selectedYear) return false;
        if (selectedMonth !== "all" && getMonth(date) !== selectedMonth) return false;
        return true;
    }) || [];

    const totalFilteredExpenses = filteredExpenses.reduce((acc: number, curr: Expense) => acc + Number(curr.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
                    <p className="text-muted-foreground">Manage agency expenses and track spending.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                    <PeriodFilter
                        viewType="monthly" // Always monthly view for table list
                        setViewType={() => { }} // Disabled toggle for this page
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                    />
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="h-14">+ Add Expense</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Expense</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={newExpense.category}
                                        onValueChange={(val: string) => setNewExpense({ ...newExpense, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories?.results?.map((cat: ExpenseCategory) => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={newExpense.amount}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="date">Date Incurred</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={newExpense.date_incurred}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, date_incurred: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="frequency">Frequency</Label>
                                    <Select
                                        value={newExpense.frequency}
                                        onValueChange={(val) => setNewExpense({ ...newExpense, frequency: val })}
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
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={newExpense.description}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    />
                                </div>

                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Saving..." : "Save Expense"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <div className="h-14 flex items-center">
                        <ManageCategoriesDialog categories={categories?.results || []} />
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses for Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">KES {totalFilteredExpenses.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedMonth === "all" ? `${selectedYear} Total` : `${format(new Date(selectedYear, selectedMonth as number), "MMMM yyyy")}`}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[100px] text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expensesLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ) : filteredExpenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">No expenses found for this period.</TableCell>
                            </TableRow>
                        ) : (
                            filteredExpenses.map((expense: Expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.date_incurred}</TableCell>
                                    <TableCell>{expense.category_name}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{expense.frequency}</span>
                                            {expense.is_recurring && (
                                                <span className="text-[10px] text-blue-600 font-semibold">RECURRING</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {Number(expense.amount).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(expense)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(expense.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <EditExpenseDialog
                expense={selectedExpense}
                categories={categories?.results || []}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
            />
        </div>
    );
}
