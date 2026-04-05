"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgencyRevenue } from "@/types/finance";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface RevenueBreakdownProps {
    data?: AgencyRevenue[];
    dateFrom?: string;
    dateTo?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function RevenueBreakdown({ data, dateFrom, dateTo }: RevenueBreakdownProps) {
    if (!data || data.length === 0) return null;

    const filterByDate = (dateStr: string) => {
        if (!dateFrom || !dateTo || !dateStr) return true;
        const d = dateStr.substring(0, 10);
        return d >= dateFrom && d <= dateTo;
    };

    // Aggregates
    const byProvider: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    const byPolicy: Record<string, number> = {};

    data.forEach(item => {
        if (!filterByDate(item.date_recognized)) return;

        const amount = Number(item.amount);
        const provider = item.provider_name || 'Unknown';
        const type = item.policy_type_name || 'Unknown';
        const customer = item.customer_name || 'Unknown';
        const policy = item.source_policy_number || 'Unknown';

        byProvider[provider] = (byProvider[provider] || 0) + amount;
        byType[type] = (byType[type] || 0) + amount;
        byCustomer[customer] = (byCustomer[customer] || 0) + amount;
        byPolicy[policy] = (byPolicy[policy] || 0) + amount;
    });

    const processData = (record: Record<string, number>) => {
        const sorted = Object.entries(record)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length <= 8) return sorted;
        const top7 = sorted.slice(0, 7);
        const othersValue = sorted.slice(7).reduce((acc, curr) => acc + curr.value, 0);
        return [...top7, { name: 'Others', value: othersValue }];
    };

    const providerData = processData(byProvider);
    const typeData = processData(byType);
    const customerData = processData(byCustomer);
    const policyData = processData(byPolicy);

    const renderChart = (chartData: { name: string; value: number }[], title: string, breakdownType: string) => (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900">{title}</CardTitle>
                    <Link
                        href="/reports/revenue"
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full transition-colors"
                    >
                        View Full Table <ExternalLink className="h-3 w-3" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="px-0 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 h-[300px] w-full min-w-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                strokeWidth={2}
                                stroke="#fff"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => `KES ${value.toLocaleString()}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-full md:w-80 space-y-4">
                    {chartData.map((item, index) => (
                        <Link
                            key={index}
                            href={`/reports/revenue?search=${encodeURIComponent(item.name === 'Others' ? '' : item.name)}`}
                            className="flex items-center justify-between text-sm group p-2 hover:bg-emerald-50/50 rounded-lg transition-all duration-200"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div
                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-gray-600 truncate group-hover:text-emerald-900 font-medium transition-colors" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 whitespace-nowrap">
                                    KES {item.value.toLocaleString()}
                                </span>
                                <ExternalLink className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    if (providerData.length === 0 && typeData.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">Revenue Analysis</h3>
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-3 pb-1">Breakdown By</p>
                </div>
            </div>

            <Card className="overflow-hidden border-2 border-emerald-50 rounded-2xl shadow-xl shadow-emerald-900/5">
                <CardContent className="p-0">
                    <Tabs defaultValue="provider" className="w-full">
                        <div className="bg-emerald-600/5 p-4 border-b border-emerald-100">
                            <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-white/50 backdrop-blur-sm h-12 p-1.5 rounded-xl border border-emerald-100 shadow-inner">
                                <TabsTrigger value="provider" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Provider</TabsTrigger>
                                <TabsTrigger value="type" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Policy Type</TabsTrigger>
                                <TabsTrigger value="customer" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Customer</TabsTrigger>
                                <TabsTrigger value="policy" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">Policy</TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="p-8">
                            <TabsContent value="provider" className="mt-0 outline-none">
                                {renderChart(providerData, "Revenue by Insurance Provider", "provider")}
                            </TabsContent>
                            <TabsContent value="type" className="mt-0 outline-none">
                                {renderChart(typeData, "Revenue by Policy Type", "type")}
                            </TabsContent>
                            <TabsContent value="customer" className="mt-0 outline-none">
                                {renderChart(customerData, "Revenue by Top Contributing Customers", "customer")}
                            </TabsContent>
                            <TabsContent value="policy" className="mt-0 outline-none">
                                {renderChart(policyData, "Revenue by Specific Policy Performance", "policy")}
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
