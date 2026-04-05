"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/financeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Expense, PayrollRun, AgencyRevenue, PaginatedResponse } from "@/types/finance";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueBreakdown } from "./RevenueBreakdown";
import { ExpenseBreakdown } from "./ExpenseBreakdown";
import React from 'react';

interface PnLReportProps {
    dateFrom?: string;
    dateTo?: string;
}

export function PnLReport({ dateFrom, dateTo }: PnLReportProps) {
    const hasDateRange = Boolean(dateFrom && dateTo);

    // Common params for all queries - try to fetch all data or filter by date
    const queryParams = {
        page_size: 1000,
        date_from: dateFrom,
        date_to: dateTo,
        // Also try standard filter names just in case
        start_date: dateFrom,
        end_date: dateTo
    };

    const { data: expenses, isLoading: loadingExpenses } = useQuery<PaginatedResponse<Expense>>({
        queryKey: ["expenses", dateFrom, dateTo],
        queryFn: () => financeService.getExpenses(queryParams),
        enabled: hasDateRange,
    });

    const { data: revenue, isLoading: loadingRevenue } = useQuery<PaginatedResponse<AgencyRevenue>>({
        queryKey: ["agency-revenue", dateFrom, dateTo],
        queryFn: () => financeService.getAgencyRevenue(queryParams),
        enabled: hasDateRange,
    });

    const { data: payroll, isLoading: loadingPayroll } = useQuery<PaginatedResponse<PayrollRun>>({
        queryKey: ["payroll-runs", dateFrom, dateTo],
        queryFn: () => financeService.getPayrollRuns(queryParams),
        enabled: hasDateRange,
    });

    if (!hasDateRange) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Please select a period to view the P&L report.</p>
            </div>
        );
    }

    if (loadingExpenses || loadingRevenue || loadingPayroll) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    const filterByDate = (dateStr: string) => {
        if (!dateFrom || !dateTo || !dateStr) return true;
        // robust string comparison for YYYY-MM-DD (works for ISO timestamps too by taking first 10 chars)
        const d = dateStr.substring(0, 10);
        return d >= dateFrom && d <= dateTo;
    };

    // Calculate Aggregates
    const aggregates: Record<string, { key: string, label: string, revenue: number, expense: number, profit: number }> = {};

    // 1. Process Revenue
    revenue?.results?.forEach((rev: AgencyRevenue) => {
        if (!filterByDate(rev.date_recognized)) return;
        const date = parseISO(rev.date_recognized);
        const key = format(date, 'yyyy-MM');
        const label = format(date, 'MMM yyyy');

        if (!aggregates[key]) aggregates[key] = { key, label, revenue: 0, expense: 0, profit: 0 };
        aggregates[key].revenue += Number(rev.amount);
    });

    // 2. Process Expenses
    expenses?.results?.forEach((exp: Expense) => {
        if (!filterByDate(exp.date_incurred)) return;
        const date = parseISO(exp.date_incurred);
        const key = format(date, 'yyyy-MM');
        const label = format(date, 'MMM yyyy');

        if (!aggregates[key]) aggregates[key] = { key, label, revenue: 0, expense: 0, profit: 0 };
        aggregates[key].expense += Number(exp.amount);
    });

    // 3. Process Payroll
    payroll?.results?.forEach((run: PayrollRun) => {
        if (run.status !== 'DRAFT') {
            if (!filterByDate(run.month)) return;
            const date = parseISO(run.month);
            const key = format(date, 'yyyy-MM');
            const label = format(date, 'MMM yyyy');

            if (!aggregates[key]) aggregates[key] = { key, label, revenue: 0, expense: 0, profit: 0 };
            aggregates[key].expense += Number(run.total_payout);
        }
    });

    const chartData = Object.values(aggregates).map(d => ({
        ...d,
        profit: d.revenue - d.expense,
    })).sort((a, b) => a.key.localeCompare(b.key));

    const totalRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExpense = chartData.reduce((acc, curr) => acc + curr.expense, 0);
    const totalProfit = totalRevenue - totalExpense;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">+KES {totalRevenue.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">-KES {totalExpense.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            KES {totalProfit.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profit & Loss Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[350px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No data available for the selected period.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1">
                <RevenueBreakdown
                    data={revenue?.results}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                />
            </div>

            <ExpenseBreakdown
                expenses={expenses?.results}
                payroll={payroll?.results}
                dateFrom={dateFrom}
                dateTo={dateTo}
            />
        </div>
    );
}
