"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense, PayrollRun } from "@/types/finance";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface ExpenseBreakdownProps {
    expenses?: Expense[];
    payroll?: PayrollRun[];
    dateFrom?: string;
    dateTo?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#d946ef'];

export function ExpenseBreakdown({ expenses, payroll, dateFrom, dateTo }: ExpenseBreakdownProps) {
    if ((!expenses || expenses.length === 0) && (!payroll || payroll.length === 0)) return null;

    const filterByDate = (dateStr: string) => {
        if (!dateFrom || !dateTo || !dateStr) return true;
        const d = dateStr.substring(0, 10);
        return d >= dateFrom && d <= dateTo;
    };

    // Aggregate by Category
    const byCategory: Record<string, number> = {};

    // 1. Process Expenses
    expenses?.forEach(item => {
        if (!filterByDate(item.date_incurred)) return;

        const amount = Number(item.amount);
        const category = item.category_name || 'Uncategorized';

        byCategory[category] = (byCategory[category] || 0) + amount;
    });

    // 2. Process Payroll
    payroll?.forEach(run => {
        if (run.status === 'DRAFT') return;
        if (!filterByDate(run.month)) return;

        const amount = Number(run.total_payout);
        byCategory['Payroll'] = (byCategory['Payroll'] || 0) + amount;
    });

    const chartData = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Filter out zero values
    const filteredChartData = chartData.filter(d => d.value > 0);

    if (filteredChartData.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight">Expense Breakdown</h3>
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row gap-8">
                        <div className="h-[300px] flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={filteredChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#ef4444"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {filteredChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="border rounded-lg p-4">
                                <h4 className="font-semibold mb-4">Detailed Breakdown</h4>
                                <div className="space-y-2">
                                    {filteredChartData.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                                            <span className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                {item.name}
                                            </span>
                                            <span className="font-medium">KES {item.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between text-sm pt-4 font-bold border-t mt-4">
                                        <span>Total</span>
                                        <span>KES {filteredChartData.reduce((a, b) => a + b.value, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
