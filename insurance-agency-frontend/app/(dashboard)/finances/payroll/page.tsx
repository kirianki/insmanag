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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, getYear, getMonth } from "date-fns";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PayrollRun, PaginatedResponse, StaffPayment } from "@/types/finance";
import { AxiosError } from "axios";
import { PeriodFilter } from "@/components/finance/period-filter";

export default function PayrollPage() {
    const queryClient = useQueryClient();
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [generationMonth, setGenerationMonth] = useState(format(new Date(), "yyyy-MM-dd"));

    // Filtering state
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number | "all">("all");
    const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

    const { data: payrollRuns, isLoading: runsLoading } = useQuery<PaginatedResponse<PayrollRun>>({
        queryKey: ["payroll-runs"],
        queryFn: financeService.getPayrollRuns,
    });

    const generateMutation = useMutation({
        mutationFn: financeService.generatePayroll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
            setIsGenerateOpen(false);
            toast.success("Payroll generated successfully");
        },
        onError: (error: Error | AxiosError) => {
            const msg = (error as AxiosError<{ error: string }>).response?.data?.error || "Failed to generate payroll";
            toast.error(msg);
        },
    });

    const approveMutation = useMutation({
        mutationFn: financeService.approvePayroll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
            toast.success("Payroll approved and finalized");
        },
        onError: (error: Error | AxiosError) => {
            const msg = (error as AxiosError<{ error: string }>).response?.data?.error || "Failed to approve payroll";
            toast.error(msg);
        },
    });

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        generateMutation.mutate(generationMonth);
    };

    const handleApprove = (id: string) => {
        if (confirm("Are you sure you want to approve this payroll? This action cannot be undone.")) {
            approveMutation.mutate(id);
        }
    };

    // Filter logic
    const filteredRuns = payrollRuns?.results?.filter((run: PayrollRun) => {
        const date = parseISO(run.month);
        if (getYear(date) !== selectedYear) return false;
        if (selectedMonth !== "all" && getMonth(date) !== selectedMonth) return false;
        return true;
    }) || [];

    const totalPayoutForPeriod = filteredRuns.reduce((acc: number, curr: PayrollRun) => acc + Number(curr.total_payout), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
                    <p className="text-muted-foreground">Manage monthly payroll runs, contracts, and payouts.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                    <PeriodFilter
                        viewType="monthly" // Use monthly selector for list
                        setViewType={() => { }} // Toggle disabled
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                    />
                    <div className="flex gap-2 h-14 items-center">
                        <Button variant="outline" onClick={() => window.location.href = '/finances/contracts'}>
                            Manage Contracts
                        </Button>

                        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                            <DialogTrigger asChild>
                                <Button>Run Payroll</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Generate Payroll Run</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleGenerate} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="month">Month (Select any date in the month)</Label>
                                        <Input
                                            id="month"
                                            type="date"
                                            value={generationMonth}
                                            onChange={(e) => setGenerationMonth(e.target.value)}
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground">The payroll will be generated for the 1st of the selected month.</p>
                                    </div>

                                    <Button type="submit" disabled={generateMutation.isPending}>
                                        {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Generate Draft
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payouts for Period</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">KES {totalPayoutForPeriod.toLocaleString()}</div>
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
                            <TableHead>Month</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Processed By</TableHead>
                            <TableHead className="text-right">Total Payout</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {runsLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ) : filteredRuns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No payroll runs found for this period.</TableCell>
                            </TableRow>
                        ) : (
                            filteredRuns.map((run: PayrollRun) => (
                                <TableRow key={run.id}>
                                    <TableCell className="font-medium">{format(parseISO(run.month), 'MMMM yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={run.status === 'APPROVED' ? 'default' : 'secondary'}>
                                            {run.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{run.processed_by_name}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        KES {Number(run.total_payout).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {run.status === 'DRAFT' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(run.id)}
                                                disabled={approveMutation.isPending}
                                            >
                                                {approveMutation.isPending ? "Processing..." : "Approve & Pay"}
                                            </Button>
                                        )}
                                        {run.status === 'APPROVED' && (
                                            <Button size="sm" variant="outline" disabled>
                                                Paid
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="ml-2"
                                            onClick={() => setSelectedRun(run)}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Payroll Details Dialog */}
            <Dialog open={!!selectedRun} onOpenChange={(open: boolean) => !open && setSelectedRun(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Payroll Details - {selectedRun && format(parseISO(selectedRun.month), 'MMMM yyyy')}</DialogTitle>
                    </DialogHeader>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-right">Base Salary</TableHead>
                                    <TableHead className="text-right">Commissions</TableHead>
                                    <TableHead className="text-right">Deductions</TableHead>
                                    <TableHead className="text-right">Net Pay</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedRun?.payments?.map((payment: StaffPayment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.user_name}</TableCell>
                                        <TableCell>{payment.user_email}</TableCell>
                                        <TableCell className="text-right">KES {Number(payment.base_pay).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">KES {Number(payment.commission_pay).toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-red-600">- KES {Number(payment.deductions_total).toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">KES {Number(payment.net_pay).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
