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
    // Track deductions separately
    let totalDeductions = 0;

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

        // The user wants gross salary (total_payout now reflects this from backend)
        const amount = Number(run.total_payout);
        byCategory['Payroll (Gross)'] = (byCategory['Payroll (Gross)'] || 0) + amount;

        // Sum deductions for the period from all payments in this run
        run.payments?.forEach(p => {
            totalDeductions += Number(p.deductions_total);
        });
    });

    const chartData = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Filter out zero values
    const filteredChartData = chartData.filter(d => d.value > 0);

    if (filteredChartData.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">Expense Breakdown</h3>
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 md:col-span-2 shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50/50 border-b">
                        <CardTitle className="text-base font-semibold">Expenses by Category (Gross)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col lg:flex-row gap-8 pt-6">
                        <div className="h-[300px] flex-1 min-w-[300px]">
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
                                    <Tooltip
                                        formatter={(value: number) => `KES ${value.toLocaleString()}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-6">
                            <div className="border rounded-xl p-5 bg-white shadow-sm">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                                    <span>Detailed Breakdown</span>
                                    <span className="text-xs font-normal text-gray-500 uppercase tracking-wider">Amount</span>
                                </h4>
                                <div className="space-y-3">
                                    {filteredChartData.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm py-2 group hover:bg-gray-50 px-2 rounded-md transition-colors">
                                            <span className="flex items-center gap-3">
                                                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="text-gray-600 group-hover:text-gray-900">{item.name}</span>
                                            </span>
                                            <span className="font-semibold text-gray-900 group-hover:scale-105 transition-transform origin-right">KES {item.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between text-base pt-4 font-bold border-t mt-4 text-gray-900 px-2">
                                        <span>Total Gross Expense</span>
                                        <span className="text-red-600">KES {filteredChartData.reduce((a, b) => a + b.value, 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {totalDeductions > 0 && (
                                <div className="border rounded-xl p-5 bg-orange-50/30 border-orange-100 shadow-sm">
                                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                        Withheld Deductions
                                    </h4>
                                    <p className="text-xs text-orange-600 mb-4 italic">These are included in Gross Payroll but held for statutory remittances (Tax, NSSF, etc.)</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-orange-700">Total Deductions Held</span>
                                        <span className="text-lg font-bold text-orange-800">KES {totalDeductions.toLocaleString()}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-orange-500">
                                        Net Cash Flow Impact: KES {(filteredChartData.reduce((a, b) => a + b.value, 0) - totalDeductions).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
