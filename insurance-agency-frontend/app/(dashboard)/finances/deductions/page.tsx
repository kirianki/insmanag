"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { StaffDeduction, DeductionType, UserBasic, AnnualDeductionSummary } from "@/types/finance";

export default function DeductionsHistoryPage() {
    // State for filtering
    const [search, setSearch] = useState("");
    const [deductionType, setDeductionType] = useState<string>("all");
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [year, setYear] = useState(new Date().getFullYear());
    const [page, setPage] = useState(1);

    // Fetch Users for filter
    const { data: usersData } = useQuery({
        queryKey: ["users"],
        queryFn: financeService.getUsers,
    });

    // Fetch Annual Summary
    const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
        queryKey: ["annual-deductions-summary", year, selectedUser],
        queryFn: () => financeService.getAnnualDeductionsSummary(year, selectedUser !== "all" ? selectedUser : undefined),
    });

    // Fetch Deductions
    const { data: deductionsData, isLoading: isDeductionsLoading } = useQuery({
        queryKey: ["staff-deductions", page, search, deductionType, selectedUser],
        queryFn: () => financeService.getStaffDeductions({
            page,
            search,
            staff_payment__user: selectedUser !== "all" ? selectedUser : undefined,
            deduction_type: deductionType !== "all" ? deductionType : undefined
        }),
    });

    // Fetch Deduction Types for filter
    const { data: typesData } = useQuery({
        queryKey: ["deduction-types"],
        queryFn: financeService.getDeductionTypes,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to first page on search
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Deductions History</h1>
                <p className="text-muted-foreground">Monitor and track annual staff deductibles.</p>
            </div>

            {/* Annual Summary Section */}
            <div className="grid gap-4 md:grid-cols-4">
                {isSummaryLoading ? (
                    <Card><CardContent className="py-6 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></CardContent></Card>
                ) : summaryData?.length === 0 ? (
                    <Card><CardContent className="py-6 text-center text-muted-foreground">No annual data for {year}</CardContent></Card>
                ) : (
                    summaryData?.map((sum: AnnualDeductionSummary) => (
                        <Card key={sum.name}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">{sum.name} ({year})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">KES {Number(sum.total).toLocaleString()}</div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    placeholder="Search staff..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                />
                                <Button type="submit" variant="secondary"><Search className="h-4 w-4" /></Button>
                            </form>
                        </div>
                        <div className="w-[200px]">
                            <Select value={selectedUser} onValueChange={(val: string) => { setSelectedUser(val); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Staff</SelectItem>
                                    {usersData?.results?.map((u: UserBasic) => (
                                        <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[200px]">
                            <Select value={deductionType} onValueChange={(val: string) => { setDeductionType(val); setPage(1); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {typesData?.results?.map((t: DeductionType) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[120px]">
                            <Select value={year.toString()} onValueChange={(val: string) => setYear(parseInt(val))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Staff</TableHead>
                            <TableHead>Deduction Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isDeductionsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
                        ) : deductionsData?.results?.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8">No deductions found.</TableCell></TableRow>
                        ) : (
                            deductionsData?.results?.map((deduction: StaffDeduction) => (
                                <TableRow key={deduction.id}>
                                    <TableCell>{format(new Date(deduction.created_at), "MMM d, yyyy")}</TableCell>
                                    <TableCell>{deduction.staff_name || "Unknown Staff"}</TableCell>
                                    <TableCell>{deduction.deduction_type_name || "Unknown Type"}</TableCell>
                                    <TableCell className="text-right font-medium">KES {Number(deduction.amount).toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination (Simple) */}
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    disabled={!deductionsData?.previous}
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    disabled={!deductionsData?.next}
                    onClick={() => setPage((p: number) => p + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
