"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AgencyRevenue } from "@/types/finance";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

    // Aggregate by Provider
    const byProvider: Record<string, number> = {};
    // Aggregate by Policy Type
    const byType: Record<string, number> = {};

    data.forEach(item => {
        if (!filterByDate(item.date_recognized)) return;

        const amount = Number(item.amount);
        const provider = item.provider_name || 'Unknown';
        const type = item.policy_type_name || 'Unknown';

        byProvider[provider] = (byProvider[provider] || 0) + amount;
        byType[type] = (byType[type] || 0) + amount;
    });

    // Helper to process data: Top 5 + Others
    const processData = (record: Record<string, number>) => {
        const sorted = Object.entries(record)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length <= 5) return sorted;

        const top5 = sorted.slice(0, 5);
        const othersValue = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);

        return [...top5, { name: 'Others', value: othersValue }];
    };

    const providerData = processData(byProvider);
    const typeData = processData(byType);

    // Helper to render chart
    const renderChart = (chartData: { name: string; value: number }[], title: string) => (
        <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col md:flex-row items-center gap-6 p-6">
                <div className="flex-1 h-[250px] w-full min-w-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => `KES ${value.toLocaleString()}`}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-full md:w-auto md:min-w-[200px] space-y-3">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm group">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div
                                    className="h-3 w-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-gray-600 truncate group-hover:text-gray-900 transition-colors" title={item.name}>
                                    {item.name}
                                </span>
                            </div>
                            <span className="font-medium text-gray-900 ml-2 whitespace-nowrap">
                                KES {item.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    if (providerData.length === 0 && typeData.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight text-gray-900">Revenue Breakdown</h3>
            <div className="grid gap-6 lg:grid-cols-2">
                {renderChart(providerData, "Revenue by Provider")}
                {renderChart(typeData, "Revenue by Policy Type")}
            </div>
        </div>
    );
}
